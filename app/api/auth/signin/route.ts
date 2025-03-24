import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcrypt';
import { query } from '@/lib/db';
import { sign } from 'jsonwebtoken';
import logger from '@/lib/logger';

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET must be set');
}

// Store the secret in a properly typed variable
const jwtSecret: string = process.env.NEXTAUTH_SECRET;

// Handle POST requests
export async function POST(req: NextRequest) {
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.error({ error: parseError }, 'Failed to parse request body');
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      logger.warn('Missing required fields');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const users = await query<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
    }>(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      logger.warn({ email }, 'User not found');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValid = await compare(password, user.password_hash);

    if (!isValid) {
      logger.warn({ userId: user.id }, 'Invalid password');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token with properly typed secret
    const token = sign(
      { 
        userId: user.id,
        email: user.email,
        name: user.name
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    logger.info({ userId: user.id }, 'User signed in successfully');

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      access_token: token
    });

  } catch (error) {
    // Log the full error details
    logger.error({
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      }
    }, 'Sign in error');

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests - Return JSON instead of HTML
export async function GET() {
  return NextResponse.json({
    message: 'Please use POST method for authentication',
    endpoints: {
      signin: {
        method: 'POST',
        url: '/api/auth/signin',
        body: {
          email: 'string',
          password: 'string'
        }
      }
    }
  }, { status: 405 });
}