'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ComplaintForm } from '@/components/complaint-form';
import { TrackingSearch } from '@/components/tracking-search';
import { useUser, SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';
import { 
  Camera, 
  Search, 
  FileText, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  UserPlus,
  LogIn,
  Users,
  Shield,
  ArrowRight
} from 'lucide-react';

type Step = 'home' | 'complaint' | 'tracking';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<Step>('home');
  const [searchToken, setSearchToken] = useState('');
  const router = useRouter();
  const { user } = useUser();

  const handleBack = () => {
    setCurrentStep('home');
    setSearchToken('');
  };

  const handleTrackComplaint = () => {
    if (searchToken.trim()) {
      router.push(`/track/${encodeURIComponent(searchToken.trim())}`);
    }
  };

  if (currentStep === 'complaint') {
    return <ComplaintForm onBack={handleBack} />;
  }

  if (currentStep === 'tracking') {
    return <TrackingSearch onBack={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
              <Camera className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Pune Pulse
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Camera-first civic complaint system for Pune Municipal Corporation. 
              Report issues instantly with photos and track resolution progress.
            </p>
            
            {/* Authentication Status */}
            <SignedOut>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Get Started</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Sign up for better complaint tracking and email notifications
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <SignUpButton mode="redirect">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up
                    </Button>
                  </SignUpButton>
                  <SignInButton mode="redirect">
                    <Button variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </SignInButton>
                </div>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-green-900 mb-2">Welcome back!</h3>
                <p className="text-sm text-green-700 mb-4">
                  Signed in as: {user?.emailAddresses[0]?.emailAddress}
                </p>
                <p className="text-sm text-green-600">
                  You can now submit complaints with automatic email tracking.
                </p>
              </div>
            </SignedIn>
          </div>
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Worker Login */}
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-200"
                onClick={() => window.open('https://shaktighssp.shop/worker/login', '_blank')}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Worker Login</h3>
              <p className="text-gray-600 mb-4">
                Field workers can access their dashboard to view assigned complaints and submit progress reports
              </p>
              <Button variant="outline" className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Access Worker Portal
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>

          {/* Admin Access */}
          <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-200"
                onClick={() => window.open('https://shaktighssp.shop/admin', '_blank')}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Admin Dashboard</h3>
              <p className="text-gray-600 mb-4">
                Administrative access to manage complaints, assign workers, and review progress reports
              </p>
              <Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-50">
                <Shield className="w-4 h-4 mr-2" />
                Access Admin Panel
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Action Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Submit Complaint */}
          <SignedOut>
            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-200"
                  onClick={() => setCurrentStep('complaint')}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Camera className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-500">Submit New Complaint</h3>
                <p className="text-gray-500 mb-6">
                  Please sign up first to submit complaints
                </p>
                <SignUpButton mode="redirect">
                  <Button className="w-full" size="lg">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Sign Up Required
                  </Button>
                </SignUpButton>
              </div>
            </Card>
          </SignedOut>

          <SignedIn>
            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-200"
                  onClick={() => setCurrentStep('complaint')}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Camera className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Submit New Complaint</h3>
                <p className="text-gray-600 mb-6">
                  Report civic issues with photos and get automatic tracking
                </p>
                <Button className="w-full" size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Start Complaint
                </Button>
              </div>
            </Card>
          </SignedIn>

          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-200"
                onClick={() => setCurrentStep('tracking')}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Track Complaint</h3>
              <p className="text-gray-600 mb-6">
                Enter your complaint token to check status and progress
              </p>
              <div className="space-y-3">
                <Input
                  placeholder="Enter complaint token (e.g., PMC-123456)"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  className="text-center"
                />
                <Button 
                  onClick={handleTrackComplaint}
                  className="w-full" 
                  size="lg"
                  disabled={!searchToken.trim()}
                >
                  <Search className="w-5 h-5 mr-2" />
                  Track Complaint
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, fast, and effective complaint management</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                <Camera className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Report Issue</h3>
              <p className="text-gray-600">Take photos and describe the problem with location details</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">2. Get Tracking</h3>
              <p className="text-gray-600">Receive a unique token and email notifications for updates</p>
            </div>
            
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Track Progress</h3>
              <p className="text-gray-600">Monitor resolution status and receive updates via email</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 Pune Pulse - Civic Complaint Management System
          </p>
        </div>
      </footer>
    </div>
  );
}