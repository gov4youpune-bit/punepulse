'use client';
export const dynamic = "force-dynamic";

import { createClient } from '@supabase/supabase-js';

import { useState } from 'react';
import { Camera, MapPin, Send, FileText, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { CameraCapture } from '@/components/camera-capture';
import { LocationCapture } from '@/components/location-capture';
import { ComplaintForm } from '@/components/complaint-form';
import { TrackingSearch } from '@/components/tracking-search';

type Step = 'camera' | 'location' | 'form' | 'tracking';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<Step | null>(null);

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
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-blue-600">
                <Users className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
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
            No registration required - get a tracking token instantly.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-8 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-200"
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