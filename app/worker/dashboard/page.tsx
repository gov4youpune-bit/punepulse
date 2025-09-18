'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Camera, 
  FileText, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Plus
} from 'lucide-react';
import { WorkerReportForm } from '@/components/worker-report-form';

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

export default function WorkerDashboard() {
  const { user, isLoaded } = useUser();
  const [complaints, setComplaints] = useState<AssignedComplaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<AssignedComplaint | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);

  const fetchAssignedComplaints = useCallback(async () => {
    if (!isLoaded || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('[WORKER DASHBOARD] Fetching assigned complaints...');
      
      const response = await fetch('/api/complaints/assigned');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[WORKER DASHBOARD] Received data:', data);
      
      setComplaints(data.complaints || []);
    } catch (err: any) {
      console.error('[WORKER DASHBOARD] Error fetching complaints:', err);
      setError(err.message || 'Failed to fetch assigned complaints');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, user]);

  useEffect(() => {
    fetchAssignedComplaints();
  }, [fetchAssignedComplaints]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'assigned':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewComplaint = (complaint: AssignedComplaint) => {
    setSelectedComplaint(complaint);
  };

  const handleSubmitReport = (complaint: AssignedComplaint) => {
    setSelectedComplaint(complaint);
    setShowReportForm(true);
  };

  const handleReportSubmitted = () => {
    setShowReportForm(false);
    setSelectedComplaint(null);
    // Refresh the complaints list
    fetchAssignedComplaints();
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">You need to be signed in to access the worker dashboard.</p>
            <Button onClick={() => window.location.href = '/'}>
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Worker Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {user.emailAddresses[0]?.emailAddress || user.firstName || 'Worker'}
          </p>
          <p className="text-sm text-gray-500">
            Manage your assigned complaints and submit progress reports
          </p>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading assigned complaints...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Complaints State */}
        {!loading && !error && complaints.length === 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assigned Complaints</h3>
                <p className="text-gray-600 mb-4">
                  You don&apos;t have any complaints assigned to you yet.
                </p>
                <Button onClick={() => window.location.href = '/'}>
                  Go to Home Page
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complaints List */}
        {!loading && !error && complaints.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Assigned Complaints ({complaints.length})
              </h2>
              <Button 
                onClick={() => fetchAssignedComplaints()}
                variant="outline"
                size="sm"
              >
                Refresh
              </Button>
            </div>

            <div className="grid gap-6">
              {complaints.map((complaint) => (
                <Card key={complaint.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {complaint.category} - {complaint.subtype}
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(complaint.status)}
                          <Badge variant="outline" className={getUrgencyColor(complaint.urgency)}>
                            {complaint.urgency || 'medium'} priority
                          </Badge>
                          <Badge variant="secondary">
                            {complaint.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center mb-1">
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
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <p className="text-gray-700 mb-4">{complaint.description}</p>
                    
                    {/* Location */}
                    <p className="text-sm text-gray-600 mb-3">
                      <MapPin className="inline-block w-4 h-4 mr-1 text-gray-500" />
                      {complaint.location_text && (
                        <span className="mr-2" title={complaint.location_text}>
                          {complaint.location_text.length > 40 ? `${complaint.location_text.substring(0, 40)}...` : complaint.location_text}
                        </span>
                      )}
                      {complaint.location_point && (
                        <span className="text-xs text-gray-500" title={`GPS: ${complaint.location_point}`}>
                          ({complaint.location_point})
                        </span>
                      )}
                      {!(complaint.location_text || complaint.location_point) && <span>No location provided</span>}
                    </p>

                    {/* Attachments */}
                    {complaint.attachments && complaint.attachments.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <Camera className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Attachments ({complaint.attachments.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {complaint.attachments.slice(0, 4).map((attachment, index) => (
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
                                  View
                                </Button>
                              </div>
                            </div>
                          ))}
                          {complaint.attachments.length > 4 && (
                            <div className="w-full h-20 bg-gray-100 rounded border flex items-center justify-center">
                              <span className="text-sm text-gray-500">
                                +{complaint.attachments.length - 4} more
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Worker Reports */}
                    {complaint.worker_reports && complaint.worker_reports.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center mb-2">
                          <FileText className="h-4 w-4 mr-2 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            Your Reports ({complaint.worker_reports.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {complaint.worker_reports.map((report) => (
                            <div key={report.id} className="bg-gray-50 p-3 rounded">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">
                                  Report #{report.id.slice(-8)}
                                </span>
                                <Badge 
                                  variant={report.status === 'approved' ? 'default' : 
                                         report.status === 'rejected' ? 'destructive' : 'secondary'}
                                >
                                  {report.status}
                                </Badge>
                              </div>
                              {report.comments && (
                                <p className="text-sm text-gray-600 mb-2">{report.comments}</p>
                              )}
                              {report.photos && report.photos.length > 0 && (
                                <div className="flex gap-2">
                                  {report.photos.slice(0, 3).map((photo, index) => (
                                    <img
                                      key={index}
                                      src={`/api/attachments/public?key=${encodeURIComponent(photo)}`}
                                      alt={`Report photo ${index + 1}`}
                                      className="w-12 h-12 object-cover rounded border"
                                    />
                                  ))}
                                  {report.photos.length > 3 && (
                                    <div className="w-12 h-12 bg-gray-200 rounded border flex items-center justify-center">
                                      <span className="text-xs text-gray-500">
                                        +{report.photos.length - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewComplaint(complaint)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReport(complaint)}
                        disabled={complaint.status === 'resolved'}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Submit Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Report Form Modal */}
        {showReportForm && selectedComplaint && (
          <WorkerReportForm
            complaint={selectedComplaint}
            onClose={() => setShowReportForm(false)}
            onSubmitted={handleReportSubmitted}
          />
        )}
      </div>
    </div>
  );
}