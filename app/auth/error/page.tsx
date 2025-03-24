'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access denied. You may not have permission to access this resource.';
      case 'Verification':
        return 'The verification failed or the token has expired.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-center text-gray-600">
        {getErrorMessage(error)}
      </p>
      <div className="flex justify-center">
        <Button asChild>
          <Link href="/auth/signin">
            Return to Sign In
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-red-600">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}