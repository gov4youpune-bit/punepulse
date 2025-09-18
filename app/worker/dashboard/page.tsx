'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkerReportForm } from '@/components/worker-report-form';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Calendar, Clock, FileText, Camera, CheckCircle, AlertCircle, Navigation } from 'lucide-react';

interface AssignedComplaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  location_text?: string;
  location_point?: string;
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

interface AssignedResponse {
  complaints: AssignedComplaint[];
}

export default function WorkerDashboard() {
  const { user, isLoaded } = useUser();
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<AssignedComplaint | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const { toast } = useToast();

  const fetchAssignedComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/complaints/assigned');
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to access this page');
        }
        throw new Error('Failed to fetch assigned complaints');
      }
      
      const data: AssignedResponse = await response.json();
      setComplaints(data.complaints || []);
    } catch (error) {
      console.error('Failed to fetch assigned complaints:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch complaints',
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

  const handleReportSubmitted = () => {
    toast({
      title: 'Report Submitted',
      description: 'Your report has been submitted for admin review'
    });
    setShowReportForm(false);
    setSelectedComplaint(null);
    fetchAssignedComplaints(); // Refresh the list
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'admin_verification_pending': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLocation = (complaint: AssignedComplaint) => {
    const parts = [];
    
    if (complaint.location_text) {
      parts.push(complaint.location_text);
    }
    
    if (complaint.location_point) {
      parts.push(`GPS: ${complaint.location_point}`);
    } else if (complaint.lat && complaint.lng) {
      parts.push(`GPS: ${complaint.lat.toFixed(6)}, ${complaint.lng.toFixed(6)}`);
    }
    
    return parts.length > 0 ? parts.join(' | ') : 'Location not specified';
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Worker Access Required</h1>
          <p className="text-gray-600 mb-8">Please sign in to access the worker dashboard.</p>
          <Button onClick={() => window.location.href = 'https://accounts.shaktighssp.shop/sign-in'}>
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
              <h1 className="text-2xl font-bold text-gray-900">Worker Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-sm">
                {complaints.length} Assigned
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading assigned complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Complaints</h3>
            <p className="text-gray-600">You don&apos;t have any assigned complaints at the moment.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Assigned Complaints</h2>
            <div className="grid gap-6">
              {complaints.map((complaint) => (
                <Card key={complaint.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {complaint.token}
                        </h3>
                        <Badge className={getStatusColor(complaint.status)}>
                          {complaint.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getUrgencyColor(complaint.urgency || 'medium')}>
                          {complaint.urgency || 'medium'}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-2">{complaint.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {formatLocation(complaint)}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </div>
                        {complaint.assigned_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Assigned {new Date(complaint.assigned_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {complaint.attachments && complaint.attachments.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <Camera className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Attachments</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {complaint.attachments.map((attachment, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={`/api/attachments/public?key=${encodeURIComponent(attachment)}`}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder-image.png';
                                target.alt = 'Image not available';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-white bg-black/50 hover:bg-black/70"
                                onClick={() => window.open(`/api/attachments/public?key=${encodeURIComponent(attachment)}`, '_blank')}
                              >
                                View Full Size
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Worker Reports */}
                  {complaint.worker_reports && complaint.worker_reports.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <FileText className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Your Reports</span>
                      </div>
                      <div className="space-y-2">
                        {complaint.worker_reports.map((report) => (
                          <div key={report.id} className="bg-gray-50 p-3 rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">
                                Report #{report.id.slice(-8)}
                              </span>
                              <Badge className={getStatusColor(report.status)}>
                                {report.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {report.comments && (
                              <p className="text-sm text-gray-600 mb-2">{report.comments}</p>
                            )}
                            {report.photos.length > 0 && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {report.photos.map((photo, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={`/api/attachments/public?key=${encodeURIComponent(photo)}`}
                                      alt={`Report photo ${index + 1}`}
                                      className="w-full h-16 object-cover rounded border"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-image.png';
                                        target.alt = 'Image not available';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        className="text-white bg-black/50 hover:bg-black/70"
                                        onClick={() => window.open(`/api/attachments/public?key=${encodeURIComponent(photo)}`, '_blank')}
                                      >
                                        View
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Submitted {new Date(report.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setShowReportForm(true);
                      }}
                      disabled={complaint.status === 'resolved'}
                    >
                      {complaint.status === 'resolved' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolved
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Report Form Modal */}
      {showReportForm && selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Submit Report for {selectedComplaint.token}</h3>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReportForm(false);
                    setSelectedComplaint(null);
                  }}
                >
                  ×
                </Button>
              </div>
              <WorkerReportForm
                complaint={selectedComplaint}
                onClose={() => {
                  setShowReportForm(false);
                  setSelectedComplaint(null);
                }}
                onSubmitted={handleReportSubmitted}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}