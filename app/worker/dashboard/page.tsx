'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, FileText, Camera, MessageSquare } from 'lucide-react';
import { WorkerReportForm } from '@/components/worker-report-form';
import { useToast } from '@/hooks/use-toast';

interface AssignedComplaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  location_text?: string;
  status: string;
  urgency?: string;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  attachments?: string[];
  lat?: number | null;
  lng?: number | null;
  worker_reports?: Array<{
    id: string;
    comments?: string;
    photos: string[];
    status: string;
    created_at: string;
  }>;
}

export default function WorkerDashboard() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<AssignedComplaint | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);

  const fetchAssignedComplaints = useCallback(async () => {
    try {
      const res = await fetch('/api/complaints/assigned');
      if (!res.ok) throw new Error('Failed to fetch assigned complaints');
      const data = await res.json();
      setComplaints(data.complaints || []);
    } catch (err) {
      console.error('Failed to fetch assigned complaints:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to load assigned complaints', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchAssignedComplaints();
    }
  }, [isLoaded, user, fetchAssignedComplaints]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'admin_verification_pending': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency = 'medium') => {
    switch (urgency?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReportSubmitted = () => {
    setShowReportForm(false);
    setSelectedComplaint(null);
    fetchAssignedComplaints();
    toast({ 
      title: 'Report Submitted', 
      description: 'Your report has been submitted for admin review' 
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Worker Access Required</h1>
          <p className="text-gray-600 mb-8">Please sign in to access the worker dashboard.</p>
          <Button onClick={() => window.location.href = '/sign-in'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Worker Dashboard</h1>
              <p className="text-sm text-gray-500">Assigned Complaints</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-gray-500">Field Worker</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading assigned complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Complaints</h3>
            <p className="text-gray-600">You don&apos;t have any assigned complaints at the moment.</p>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Assigned Complaints ({complaints.length})
              </h2>
            </div>

            <div className="grid gap-6">
              {complaints.map((complaint) => (
                <Card key={complaint.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {complaint.token}
                      </span>
                      <Badge className={getStatusColor(complaint.status)}>
                        {complaint.status}
                      </Badge>
                      <Badge className={getUrgencyColor(complaint.urgency)} variant="outline">
                        {complaint.urgency || 'medium'}
                      </Badge>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Assigned: {new Date(complaint.assigned_at || complaint.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {complaint.category} - {complaint.subtype}
                    </h3>
                    <p className="text-gray-700 mb-3">{complaint.description}</p>
                    
                    {complaint.location_text && (
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <MapPin className="w-4 h-4 mr-1" />
                        {complaint.location_text}
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="w-4 h-4 mr-1" />
                      Created: {new Date(complaint.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Existing Reports */}
                  {complaint.worker_reports && complaint.worker_reports.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Your Reports</h4>
                      <div className="space-y-2">
                        {complaint.worker_reports.map((report, index) => (
                          <div key={report.id} className="text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">Report #{index + 1}</span>
                              <Badge className={
                                report.status === 'reviewed' ? 'bg-green-100 text-green-800' :
                                report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }>
                                {report.status}
                              </Badge>
                            </div>
                            <div className="text-gray-600">
                              {new Date(report.created_at).toLocaleString()}
                              {report.comments && (
                                <div className="mt-1 italic">&ldquo;{report.comments}&rdquo;</div>
                              )}
                            </div>
                            {report.photos.length > 0 && (
                              <div className="mt-2 flex items-center text-xs text-gray-500">
                                <Camera className="w-3 h-3 mr-1" />
                                {report.photos.length} photo(s)
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {complaint.attachments && complaint.attachments.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Original Attachments</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {complaint.attachments.map((attachment, index) => (
                          <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            <img
                              src={`/api/attachments/public?key=${encodeURIComponent(attachment)}`}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                              onClick={() => window.open(`/api/attachments/public?key=${encodeURIComponent(attachment)}`, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setShowReportForm(true);
                      }}
                      disabled={complaint.status === 'resolved'}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {complaint.worker_reports && complaint.worker_reports.length > 0 ? 'Add Report' : 'Submit Report'}
                    </Button>
                    
                    {complaint.lat && complaint.lng && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(`https://www.google.com/maps?q=${complaint.lat},${complaint.lng}`, '_blank')}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        View on Map
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Form Modal */}
      {showReportForm && selectedComplaint && (
        <WorkerReportForm
          complaint={selectedComplaint}
          onClose={() => {
            setShowReportForm(false);
            setSelectedComplaint(null);
          }}
          onSubmitted={handleReportSubmitted}
        />
      )}
    </div>
  );
}
