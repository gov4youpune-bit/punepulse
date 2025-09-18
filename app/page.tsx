'use client';
export const dynamic = "force-dynamic";

import { useState } from 'react';
import { Camera, MapPin, Send, FileText, Shield, Users, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { CameraCapture } from '@/components/camera-capture';
import { LocationCapture } from '@/components/location-capture';
import { ComplaintForm } from '@/components/complaint-form';
import { TrackingSearch } from '@/components/tracking-search';
import { useUser, SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/nextjs';

type Step = 'camera' | 'location' | 'form' | 'tracking';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const { user, isLoaded } = useUser();

  if (currentStep === 'camera') {
    return <CameraCapture onNext={() => setCurrentStep('location')} onBack={() => setCurrentStep(null)} />;
  }

  if (currentStep === 'location') {
    return <LocationCapture onNext={() => setCurrentStep('form')} onBack={() => setCurrentStep('camera')} />;
  }

  if (currentStep === 'form') {
    return <ComplaintForm onBack={() => setCurrentStep('location')} />;
  }

  if (currentStep === 'tracking') {
    return <TrackingSearch onBack={() => setCurrentStep(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Pune Pulse</h1>
                <p className="text-sm text-gray-500">PMC Civic Complaints</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => window.open('https://shaktighssp.shop/worker/login', '_blank')}
              >
                <Users className="w-4 h-4 mr-2" />
                Worker Login
              </Button>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Camera className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Report Civic Issues Instantly
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Take a photo, share location, and submit your complaint to Pune Municipal Corporation. 
            Sign up for better tracking and notifications.
          </p>
          
          {/* Clerk Authentication Section */}
          <div className="mb-8">
            <SignedOut>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Get Started</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Sign up for better complaint tracking and email notifications
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <SignUpButton>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up
                    </Button>
                  </SignUpButton>
                  <SignInButton>
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

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <SignedIn>
            <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-200"
                  onClick={() => setCurrentStep('camera')}>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Send className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Submit New Complaint</h3>
                <p className="text-gray-600 mb-6">
                  Capture photo, location, and description to submit your civic complaint
                </p>
                <Button className="w-full" size="lg">
                  <Camera className="w-5 h-5 mr-2" />
                  Start Complaint
                </Button>
              </div>
            </Card>
          </SignedIn>
          <SignedOut>
            <Card className="p-8 border-2 border-gray-200 bg-gray-50">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-500">Submit New Complaint</h3>
                <p className="text-gray-500 mb-6">
                  Please sign up first to submit complaints
                </p>
                <SignUpButton>
                  <Button className="w-full" size="lg">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Sign Up Required
                  </Button>
                </SignUpButton>
              </div>
            </Card>
          </SignedOut>

          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-200"
                onClick={() => setCurrentStep('tracking')}>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Track Complaint</h3>
              <p className="text-gray-600 mb-6">
                Enter your tracking token (PMC-XXXXXX) to check complaint status
              </p>
              <Button variant="outline" className="w-full" size="lg">
                <FileText className="w-5 h-5 mr-2" />
                Track Status
              </Button>
            </div>
          </Card>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
              <Camera className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Camera First</h3>
            <p className="text-sm text-gray-600">
              Optimized for mobile photo capture with location tagging
            </p>
          </div>
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">GPS Location</h3>
            <p className="text-sm text-gray-600">
              Automatic location capture with manual pin option
            </p>
          </div>
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Anonymous</h3>
            <p className="text-sm text-gray-600">
              No registration needed - submit complaints instantly
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Powered by Pune Municipal Corporation
          </p>
          <p className="text-xs text-gray-400">
            For emergency services, call 100 (Police) or 101 (Fire)
          </p>
        </div>
      </main>
    </div>
  );
}