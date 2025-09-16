'use client';

import { useEffect } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function SignOutPage() {
  const { signOut } = useClerk();
  const router = useRouter();

  useEffect(() => {
    // Automatically sign out when page loads
    const handleSignOut = async () => {
      try {
        await signOut();
        // Redirect to home page after sign out
        router.push('/');
      } catch (error) {
        console.error('Sign out error:', error);
        // Still redirect even if sign out fails
        router.push('/');
      }
    };

    handleSignOut();
  }, [signOut, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut className="w-8 h-8 text-blue-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Signing Out
        </h1>
        
        <p className="text-gray-600 mb-6">
          Please wait while we sign you out...
        </p>
        
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-blue-600">Signing out...</span>
        </div>
        
        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/')}
            className="w-full"
          >
            Go to Home Page
          </Button>
        </div>
      </Card>
    </div>
  );
}
