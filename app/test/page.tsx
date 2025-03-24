'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const { data: session } = useSession();
  const [result, setResult] = useState<string>('');
  
  const handleCreateWarranty = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch('/api/warranty', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.accessToken}`
        },
        body: formData
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(JSON.stringify(error, null, 2));
    }
  };

  return (
    <div className="container mx-auto p-8">
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Session Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Warranty Test Form</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWarranty} className="space-y-4">
              <div>
                <Input
                  name="productName"
                  placeholder="Product Name"
                  required
                />
              </div>
              <div>
                <Input
                  name="companyName"
                  placeholder="Company Name"
                  required
                />
              </div>
              <div>
                <Input
                  type="date"
                  name="purchaseDate"
                  required
                />
              </div>
              <div>
                <Input
                  type="date"
                  name="expiryDate"
                  required
                />
              </div>
              <div>
                <Input
                  name="additionalInfo"
                  placeholder="Additional Info"
                />
              </div>
              <div>
                <Input
                  type="file"
                  name="receiptImage"
                  required
                />
              </div>
              <div>
                <Input
                  type="file"
                  name="productImage"
                  required
                />
              </div>
              <Button type="submit">Create Warranty</Button>
            </form>

            {result && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Result:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
                  {result}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}