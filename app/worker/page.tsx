'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, FileText, MapPin, Calendar, Upload, Send, CheckCircle, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

// Types
interface AssignedComplaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  status: string;
  urgency: string;
  location_text?: string;
  created_at: string;
  updated_at: string;
  assigned_at: string;
  attachments?: string[];
  assignment_note?: string;
}

interface WorkerReport {
  complaint_id: string;
  comments: string;
  photos: string[];
}

export default function WorkerDashboard() {
  const supabase = createClientComponentClient();
  const { user, setUser, loading, setLoading } = useAuthStore();
  const { toast } = useToast();
  const router = useRouter();

  // State
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<AssignedComplaint | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportComments, setReportComments] = useState('');
  const [reportPhotos, setReportPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<any[]>([]);
  const [isUploading, setUploading] = useState(false);

  // Check authentication and role
  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (isMounted) {
          if (currentUser) {
            const userRole = currentUser.user_metadata?.role;
            if (userRole !== 'worker') {
              router.push('/');
              return;
            }
            setUser({
              id: currentUser.id,
              email: (currentUser.email as string) || '',
              role: userRole || 'worker',
            });
          } else {
            setUser(null);
            router.push('/');
          }
        }
      } catch (err) {
        console.error('Auth fetch error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [supabase, setUser, router, setLoading]);

  // Fetch assigned complaints
  const fetchAssignedComplaints = useCallback(async () => {
    setLoadingComplaints(true);
    try {
      const res = await fetch('/api/complaints/assigned');
      if (!res.ok) throw new Error('Failed to load assigned complaints');
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error('Load complaints error', err);
      toast({ title: 'Error', description: 'Unable to load assigned complaints', variant: 'destructive' });
    } finally {
      setLoadingComplaints(false);
    }
  }, [toast]);

  // Fetch complaints when user is loaded
  useEffect(() => {
    if (user) {
      fetchAssignedComplaints();
    }
  }, [user, fetchAssignedComplaints]);

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only image files are allowed",
        variant: "destructive"
      });
    }
    if (imageFiles.length > 0) {
      setReportPhotos(imageFiles);
      setUploadProgress(imageFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      })));
    }
  };

  // Upload photos
  const uploadPhotos = async (): Promise<string[]> => {
    if (!reportPhotos || reportPhotos.length === 0) return [];

    setUploading(true);
    const attachmentKeys: string[] = [];

    try {
      // Use batch upload
      const uploadResponse = await fetch('/api/attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: reportPhotos.map(img => ({
            filename: img.name,
            contentType: img.type
          }))
        })
      });
      
      if (!uploadResponse.ok) throw new Error('Failed to get upload URLs');
      
      const { uploads } = await uploadResponse.json();
      
      // Upload each file
      for (let i = 0; i < reportPhotos.length; i++) {
        const image = reportPhotos[i];
        const { uploadUrl, key } = uploads[i];
        
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading', progress: 0 } : item
        ));

        const uploadResult = await fetch(uploadUrl, {
          method: 'PUT',
          body: image,
          headers: { 'Content-Type': image.type }
        });
        
        if (!uploadResult.ok) throw new Error(`Failed to upload ${image.name}`);
        
        attachmentKeys.push(key);
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'completed', progress: 100, key } : item
        ));
      }

      return attachmentKeys;
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })));
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Submit report
  const handleSubmitReport = async () => {
    if (!selectedComplaint) return;

    try {
      // Upload photos first
      const photoKeys = await uploadPhotos();

      // Submit report
      const res = await fetch('/api/complaints/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: selectedComplaint.id,
          comments: reportComments.trim() || null,
          photos: photoKeys
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit report');
      }

      toast({ 
        title: 'Report Submitted', 
        description: 'Your report has been submitted for verification' 
      });

      setReportDialogOpen(false);
      setSelectedComplaint(null);
      setReportComments('');
      setReportPhotos([]);
      setUploadProgress([]);

      // Refresh complaints
      fetchAssignedComplaints();
    } catch (error) {
      console.error('Report submission error:', error);
      toast({
        title: "Report Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    }
  };

  // Open report dialog
  const openReportDialog = (complaint: AssignedComplaint) => {
    setSelectedComplaint(complaint);
    setReportComments('');
    setReportPhotos([]);
    setUploadProgress([]);
    setReportDialogOpen(true);
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
    toast({ title: 'Signed out' });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending_verification': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: string) => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Worker Dashboard</h1>
              <p className="text-sm text-gray-500">Assigned Complaints</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.email}</p>
              <p className="text-xs text-gray-500">Field Worker</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Assigned Complaints</h2>
          <p className="text-gray-600">View and report on complaints assigned to you</p>
        </div>

        {loadingComplaints && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading complaints...</p>
          </div>
        )}

        {!loadingComplaints && complaints.length === 0 && (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Complaints</h3>
            <p className="text-gray-600">You don&apos;t have any complaints assigned to you yet.</p>
          </Card>
        )}

        {!loadingComplaints && complaints.length > 0 && (
          <div className="grid gap-6">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="font-mono text-lg font-bold text-blue-600">{complaint.token}</span>
                      <Badge className={getStatusColor(complaint.status)}>{complaint.status}</Badge>
                      <Badge className={getUrgencyColor(complaint.urgency)} variant="outline">
                        {complaint.urgency}
                      </Badge>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {complaint.category} - {complaint.subtype}
                    </h3>

                    <p className="text-gray-700 mb-4">{complaint.description}</p>

                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Assigned: {new Date(complaint.assigned_at).toLocaleString()}
                      </span>
                      {complaint.location_text && (
                        <span className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {complaint.location_text}
                        </span>
                      )}
                    </div>

                    {complaint.assignment_note && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Assignment Note:</strong> {complaint.assignment_note}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button onClick={() => openReportDialog(complaint)}>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Report Dialog */}
      {reportDialogOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded shadow-lg max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Submit Report</h3>
              <Button variant="ghost" onClick={() => setReportDialogOpen(false)}>Close</Button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-medium">Complaint</Label>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedComplaint.token} - {selectedComplaint.category}
                </div>
              </div>

              <div>
                <Label htmlFor="report-comments" className="text-sm font-medium">Comments</Label>
                <Textarea
                  id="report-comments"
                  placeholder="Describe what you found and what actions you took..."
                  value={reportComments}
                  onChange={(e) => setReportComments(e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="report-photos" className="text-sm font-medium">Photos</Label>
                <Input
                  id="report-photos"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload photos showing the current state and any work completed
                </p>

                {reportPhotos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {reportPhotos.map((photo, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Report photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSubmitReport} 
                  disabled={isUploading || (!reportComments.trim() && reportPhotos.length === 0)}
                >
                  {isUploading ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
