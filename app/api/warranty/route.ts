import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import logger from '@/lib/logger';
import { getToken } from 'next-auth/jwt';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const productName = formData.get('productName') as string;
    const companyName = formData.get('companyName') as string;
    const purchaseDate = formData.get('purchaseDate') as string;
    const expiryDate = formData.get('expiryDate') as string;
    const additionalInfo = formData.get('additionalInfo') as string;
    const receiptImage = formData.get('receiptImage') as File;
    const productImage = formData.get('productImage') as File;

    if (!productName || !companyName || !purchaseDate || !expiryDate || !receiptImage || !productImage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, get or create the user mapping
    let userMapping = await query<{ uuid: string }>(
      'SELECT uuid FROM user_mappings WHERE oauth_id = $1::text',
      [token.sub]
    );

    let userUuid: string;
    if (userMapping.length === 0) {
      // Create new user mapping with proper UUID casting
      const newUuid = uuidv4();
      const userId = uuidv4(); // Generate a new UUID for user_id
      await query(
        'INSERT INTO user_mappings (uuid, oauth_id, user_id) VALUES ($1::uuid, $2::text, $3::uuid)',
        [newUuid, token.sub, userId]
      );
      userUuid = newUuid;
    } else {
      userUuid = userMapping[0].uuid;
    }

    // Convert File objects to Buffers
    const receiptBuffer = Buffer.from(await receiptImage.arrayBuffer());
    const productBuffer = Buffer.from(await productImage.arrayBuffer());

    // Create base64 strings for Cloudinary
    const receiptBase64 = `data:${receiptImage.type};base64,${receiptBuffer.toString('base64')}`;
    const productBase64 = `data:${productImage.type};base64,${productBuffer.toString('base64')}`;

    // Upload images to Cloudinary
    let receiptUpload, productUpload;
    try {
      [receiptUpload, productUpload] = await Promise.all([
        cloudinary.uploader.upload(receiptBase64, {
          folder: 'warranty-receipts',
        }),
        cloudinary.uploader.upload(productBase64, {
          folder: 'warranty-products',
        }),
      ]);
    } catch (uploadError) {
      logger.error({ error: uploadError }, 'Failed to upload images to Cloudinary');
      return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
    }

    const warrantyId = uuidv4();

    // Store warranty details in PostgreSQL with proper UUID casting
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

    logger.info({ warrantyId, userId: userUuid }, 'Warranty record created successfully');
    return NextResponse.json({ warrantyId });
  } catch (error) {
    logger.error({ error }, 'Error processing warranty creation');
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's UUID from the mapping table
    const userMapping = await query<{ uuid: string }>(
      'SELECT uuid FROM user_mappings WHERE oauth_id = $1::text',
      [token.sub]
    );

    if (userMapping.length === 0) {
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
    }

    const warranties = await query(queryText, queryParams);

    logger.info({ userId: userUuid, warrantyId }, 'Warranties fetched successfully');
    return NextResponse.json(warranties);
  } catch (error) {
    logger.error({ error }, 'Error fetching warranties');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}