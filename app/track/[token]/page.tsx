'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Share2, Loader2, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Complaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  status: string;
  created_at: string;
  location_text: string | null;
  email: string | null;
}

export default function TrackPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComplaint() {
      try {
        const res = await fetch(`/api/complaints/by-token/${token}`);
        if (!res.ok) throw new Error('Complaint not found');
        const data = await res.json();
        setComplaint(data);
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Unable to fetch complaint details',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchComplaint();
  }, [token, toast]);

  const handleCopyToken = () => {
    if (complaint) {
      navigator.clipboard.writeText(complaint.token);
      toast({
        title: 'Token Copied',
        description: 'Tracking token copied to clipboard',
      });
    }
  };

  const handleShare = async () => {
    if (complaint && navigator.share) {
      try {
        await navigator.share({
          title: 'Pune Pulse Complaint',
          text: `Complaint submitted successfully. Tracking token: ${complaint.token}`,
          url: `${window.location.origin}/track/${complaint.token}`,
        });
      } catch {
        handleCopyToken();
      }
    } else {
      handleCopyToken();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600">Complaint not found</p>
          <Button className="mt-4" onClick={() => router.push('/')}>
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Complaint Details
          </h2>
          <p className="text-gray-600 text-sm">
            Submitted on {new Date(complaint.created_at).toLocaleString()}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-600">Category</Label>
            <p className="font-medium">{complaint.category}</p>
          </div>
          <div>
            <Label className="text-gray-600">Subtype</Label>
            <p className="font-medium">{complaint.subtype}</p>
          </div>
          <div>
            <Label className="text-gray-600">Description</Label>
            <p className="text-gray-800">{complaint.description}</p>
          </div>
          {complaint.location_text && (
            <div>
              <Label className="text-gray-600">Location</Label>
              <p className="text-gray-800">{complaint.location_text}</p>
            </div>
          )}
          <div>
            <Label className="text-gray-600">Status</Label>
            <p className="font-semibold text-blue-600">{complaint.status}</p>
          </div>
        </div>

        {/* 🔑 Share + Token Section */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <Label className="text-sm font-medium text-blue-900">Tracking Token</Label>
          <div className="flex items-center justify-between mt-2 bg-white border rounded px-3 py-2">
            <span className="font-mono text-lg font-bold text-blue-600">
              {complaint.token}
            </span>
            <Button variant="ghost" size="sm" onClick={handleCopyToken}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <Button className="w-full" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Tracking Token
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Submit Another Complaint
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Save your tracking token to check status updates
        </p>
      </Card>
    </div>
  );
}
