import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import logger from '@/lib/logger';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Add File type definition for environments where it might not be available
interface CustomFile extends Blob {
  readonly lastModified: number;
  readonly name: string;
  readonly webkitRelativePath: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export async function POST(req: NextRequest) {
  try {
    // Validate authentication
    const token = await getToken({ req });
    if (!token?.sub) {
      logger.warn('Unauthorized attempt to create warranty');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log the start of warranty creation
    logger.info({ userId: token.sub }, 'Starting warranty creation process');

    // Ensure the request has the correct content type
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      logger.warn({ contentType }, 'Invalid content type received');
      return NextResponse.json({ 
        error: 'Invalid content type. Expected multipart/form-data' 
      }, { status: 400 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
      logger.debug('FormData parsed successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to parse form data');
      return NextResponse.json({ 
        error: 'Failed to parse form data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 });
    }

    // Validate and extract form fields
    const productName = formData.get('productName');
    const companyName = formData.get('companyName');
    const purchaseDate = formData.get('purchaseDate');
    const expiryDate = formData.get('expiryDate');
    const additionalInfo = formData.get('additionalInfo');
    const receiptImage = formData.get('receiptImage') as CustomFile | null;
    const productImage = formData.get('productImage') as CustomFile | null;

    // Log received data (excluding file contents)
    logger.debug({
      productName,
      companyName,
      purchaseDate,
      expiryDate,
      hasReceiptImage: !!receiptImage,
      hasProductImage: !!productImage
    }, 'Received warranty creation data');

    // Validate required fields
    const validationErrors = [];
    if (!productName || typeof productName !== 'string') validationErrors.push('Product name is required');
    if (!companyName || typeof companyName !== 'string') validationErrors.push('Company name is required');
    if (!purchaseDate || typeof purchaseDate !== 'string') validationErrors.push('Purchase date is required');
    if (!expiryDate || typeof expiryDate !== 'string') validationErrors.push('Expiry date is required');
    if (!receiptImage || !(receiptImage instanceof Blob)) validationErrors.push('Receipt image is required');
    if (!productImage || !(productImage instanceof Blob)) validationErrors.push('Product image is required');

    if (validationErrors.length > 0) {
      logger.warn({ validationErrors }, 'Validation failed for warranty creation');
      return NextResponse.json({ 
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    // After validation, we know these are not null
    const validReceiptImage = receiptImage as CustomFile;
    const validProductImage = productImage as CustomFile;

    // Get or create user mapping
    let userMapping;
    try {
      userMapping = await query<{ uuid: string }>(
        'SELECT uuid FROM user_mappings WHERE oauth_id = $1::text',
        [token.sub]
      );

      logger.debug({ 
        userMappingFound: userMapping.length > 0 
      }, 'User mapping lookup complete');
    } catch (error) {
      logger.error({ error }, 'Failed to query user mapping');
      throw error;
    }

    let userUuid: string;
    if (userMapping.length === 0) {
      // Create new user mapping
      const newUuid = uuidv4();
      const userId = uuidv4();
      try {
        await query(
          'INSERT INTO user_mappings (uuid, oauth_id, user_id) VALUES ($1::uuid, $2::text, $3::uuid)',
          [newUuid, token.sub, userId]
        );
        userUuid = newUuid;
        logger.info({ userUuid }, 'Created new user mapping');
      } catch (error) {
        logger.error({ error }, 'Failed to create user mapping');
        throw error;
      }
    } else {
      userUuid = userMapping[0].uuid;
      logger.debug({ userUuid }, 'Using existing user mapping');
    }

    // Process images
    try {
      // Convert File objects to Buffers
      const receiptBuffer = Buffer.from(await validReceiptImage.arrayBuffer());
      const productBuffer = Buffer.from(await validProductImage.arrayBuffer());

      // Create base64 strings for Cloudinary
      const receiptBase64 = `data:${validReceiptImage.type};base64,${receiptBuffer.toString('base64')}`;
      const productBase64 = `data:${validProductImage.type};base64,${productBuffer.toString('base64')}`;

      logger.debug('Image buffers created successfully');

      // Upload images to Cloudinary
      const [receiptUpload, productUpload] = await Promise.all([
        cloudinary.uploader.upload(receiptBase64, {
          folder: 'warranty-receipts',
        }),
        cloudinary.uploader.upload(productBase64, {
          folder: 'warranty-products',
        }),
      ]);

      logger.info({
        receiptUrl: receiptUpload.secure_url,
        productUrl: productUpload.secure_url
      }, 'Images uploaded to Cloudinary');

      const warrantyId = uuidv4();

      // Store warranty details
      await query(
        `INSERT INTO warranties (
          warranty_id, user_id, product_name, company_name, 
          purchase_date, expiry_date, additional_info, 
          receipt_image_url, product_image_url
        ) VALUES ($1::uuid, $2::uuid, $3, $4, $5::date, $6::date, $7, $8, $9)`,
        [
          warrantyId,
          userUuid,
          productName,
          companyName,
          purchaseDate,
          expiryDate,
          additionalInfo || '',
          receiptUpload.secure_url,
          productUpload.secure_url,
        ]
      );

      logger.info({ warrantyId }, 'Warranty record created successfully');
      return NextResponse.json({ warrantyId });
    } catch (error) {
      logger.error({ 
        error,
        stack: error instanceof Error ? error.stack : undefined
      }, 'Failed to process images or create warranty record');
      throw error;
    }
  } catch (error) {
    logger.error({ 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error processing warranty creation');
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.sub) {
      logger.warn('Unauthorized attempt to fetch warranties');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's UUID from the mapping table
    const userMapping = await query<{ uuid: string }>(
      'SELECT uuid FROM user_mappings WHERE oauth_id = $1::text',
      [token.sub]
    );

    if (userMapping.length === 0) {
      logger.warn({ oauthId: token.sub }, 'User mapping not found');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userUuid = userMapping[0].uuid;
    const warrantyId = req.nextUrl.searchParams.get('warrantyId');

    let queryText = `
      SELECT * FROM warranties 
      WHERE user_id = $1::uuid
    `;
    let queryParams = [userUuid];

    if (warrantyId) {
      queryText += ' AND warranty_id = $2::uuid';
      queryParams.push(warrantyId);
      logger.debug({ warrantyId }, 'Fetching specific warranty');
    } else {
      logger.debug('Fetching all warranties for user');
    }

    const warranties = await query(queryText, queryParams);

    logger.info({ 
      userId: userUuid, 
      warrantyCount: warranties.length 
    }, 'Warranties fetched successfully');
    
    return NextResponse.json(warranties);
  } catch (error) {
    logger.error({ 
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 'Error fetching warranties');
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}