'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Share2, Loader2, Home, CheckCircle, User, Calendar, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Attachment viewer component
function AttachmentViewer({ attachmentKey, index }: { attachmentKey: string; index: number }) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const res = await fetch(`/api/attachments/public?key=${encodeURIComponent(attachmentKey)}`);
        if (!res.ok) throw new Error('Failed to get signed URL');
        const data = await res.json();
        setSignedUrl(data.url);
      } catch (err) {
        console.error('Failed to get signed URL:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attachment');
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [attachmentKey]);

  if (loading) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-square bg-red-50 rounded-lg flex items-center justify-center p-2">
        <div className="text-center text-red-600 text-xs">
          <div>Error loading</div>
          <div>Photo {index + 1}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
      {signedUrl && (
        <img
          src={signedUrl}
          alt={`Worker report photo ${index + 1}`}
          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(signedUrl, '_blank')}
        />
      )}
    </div>
  );
}

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
  verification_status?: string;
  worker_reports?: Array<{
    id: string;
    comments: string;
    photos: string[];
    status: string;
    created_at: string;
    workers?: {
      name: string;
      email: string;
    };
  }>;
  complaint_assignments?: Array<{
    id: string;
    created_at: string;
    workers?: {
      name: string;
      email: string;
    };
  }>;
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

        {/* Worker Assignment Info */}
        {complaint.complaint_assignments && complaint.complaint_assignments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-blue-600" />
              <Label className="text-blue-900 font-medium">Assigned Worker</Label>
            </div>
            <p className="text-blue-800">
              {complaint.complaint_assignments[0].workers?.name || 'Unknown Worker'}
            </p>
            <p className="text-blue-600 text-sm">
              Assigned on {new Date(complaint.complaint_assignments[0].created_at).toLocaleString()}
            </p>
          </div>
        )}

        {/* Verified Worker Reports */}
        {complaint.worker_reports && complaint.worker_reports.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <Label className="text-green-900 font-medium text-lg">Worker Reports</Label>
            </div>
            
            {complaint.worker_reports
              .filter(report => report.status === 'verified')
              .map((report, index) => (
                <Card key={report.id} className="p-4 bg-green-50 border-green-200">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-green-600" />
                        <span className="font-medium text-green-900">
                          {report.workers?.name || 'Unknown Worker'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-green-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {report.comments && (
                      <div className="bg-white rounded p-3 border">
                        <Label className="text-green-800 font-medium">Worker Comments</Label>
                        <p className="text-green-700 mt-1">{report.comments}</p>
                      </div>
                    )}

                    {report.photos && report.photos.length > 0 && (
                      <div>
                        <Label className="text-green-800 font-medium flex items-center space-x-1">
                          <ImageIcon className="w-4 h-4" />
                          <span>Photos ({report.photos.length})</span>
                        </Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                          {report.photos.map((photoKey, photoIndex) => (
                            <AttachmentViewer key={photoIndex} attachmentKey={photoKey} index={photoIndex} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        )}

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
