'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Package2, Receipt } from 'lucide-react';

interface Warranty {
  warranty_id: string;
  product_name: string;
  company_name: string;
  purchase_date: string;
  expiry_date: string;
  additional_info: string;
  receipt_image_url: string;
  product_image_url: string;
}

export default function Home() {
  const { data: session, status } = useSession();
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarranties = async () => {
      if (status === 'authenticated') {
        try {
          const response = await fetch('/api/warranty', {
            headers: {
              'Authorization': `Bearer ${session?.accessToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setWarranties(data);
          } else {
            console.error('Failed to fetch warranties:', await response.text());
          }
        } catch (error) {
          console.error('Error fetching warranties:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === 'authenticated') {
      fetchWarranties();
    } else if (status === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <h2 className="text-xl font-semibold mb-4">Please Sign In</h2>
            <p className="text-gray-500 text-center">You need to be signed in to view your warranties.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Warranties</h1>
        
        {warranties.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-48">
              <p className="text-gray-500">No warranties found. Add your first warranty to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {warranties.map((warranty) => (
              <Card key={warranty.warranty_id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package2 className="h-5 w-5" />
                    {warranty.product_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-2">
                      <Receipt className="h-5 w-5 text-gray-500 mt-1" />
                      <div>
                        <p className="font-medium">{warranty.company_name}</p>
                        <p className="text-sm text-gray-500">{warranty.additional_info}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm">
                          Purchase: {new Date(warranty.purchase_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          Expires: {new Date(warranty.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <img 
                        src={warranty.product_image_url} 
                        alt={warranty.product_name}
                        className="w-full h-24 object-cover rounded-md"
                      />
                      <img 
                        src={warranty.receipt_image_url} 
                        alt="Receipt"
                        className="w-full h-24 object-cover rounded-md"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}