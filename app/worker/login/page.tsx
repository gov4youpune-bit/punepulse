'use client';

import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Shield, CheckCircle } from 'lucide-react';

export default function WorkerLoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Worker Access</h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your assigned complaints and submit reports
          </p>
        </div>

        <Card className="p-6">
          <SignedOut>
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Field Worker Portal
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Access your dashboard to view assigned complaints and submit progress reports
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  View assigned complaints
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Upload progress photos
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Submit status reports
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Track complaint progress
                </div>
              </div>

              <SignInButton mode="redirect">
                <Button className="w-full">
                  <Shield className="w-4 h-4 mr-2" />
                  Sign In to Worker Portal
                </Button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">
                Welcome to Worker Portal
              </h2>
              <p className="text-sm text-gray-600">
                You&apos;re signed in! Access your dashboard to view assigned complaints.
              </p>
              <Button 
                onClick={() => window.location.href = 'https://shaktighssp.shop/worker/dashboard'}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </SignedIn>
        </Card>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Need help? Contact your supervisor or admin team
          </p>
        </div>
      </div>
    </div>
  );
}