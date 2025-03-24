import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import { z } from 'zod';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Validation schema for signup request
const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    const validatedData = signupSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [validatedData.email]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 12);

    // Create user
    const result = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [validatedData.name, validatedData.email, hashedPassword]
    );

    logger.info({ userId: result[0].id }, 'User created successfully');

    return NextResponse.json({
      message: 'User created successfully',
      userId: result[0].id
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    logger.error({ error }, 'Error creating user');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}