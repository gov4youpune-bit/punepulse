'use client';

import { useEffect, useMemo, useState } from 'react';
import { Shield, Users, FileText, MapPin, Calendar, Download, Search } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminAuth } from '@/components/admin-auth';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  total_complaints: number;
  pending_complaints: number;
  resolved_complaints: number;
  today_complaints: number;
}

interface Complaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  location_text?: string;
  status: string;
  created_at: string;
  updated_at: string;
  ward_number?: number;
  urgency?: string;
  attachments?: string[];
  submitted_to_portal?: any;
  audit_logs?: any[];
}

export default function AdminDashboard() {
  // auth / supabase
  const supabase = createClientComponentClient();
  const { user, setUser, loading, setLoading } = useAuthStore();
  const { toast } = useToast();

  // page state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // stable handlers and colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency = 'medium') => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // keep filter results updated
  useEffect(() => {
    const filtered = complaints.filter((c) => {
      const matchesSearch =
        searchTerm === '' ||
        c.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location_text || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    setFilteredComplaints(filtered);
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  // watch auth state and populate user store
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
            setUser({
              id: currentUser.id,
              email: (currentUser.email as string) || '',
              role: (currentUser.user_metadata?.role as string) || 'operator',
            });
          } else {
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth fetch error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    // auth state listener to keep store in sync
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      if (u) {
        setUser({
          id: u.id,
          email: (u.email as string) || '',
          role: (u.user_metadata?.role as string) || 'operator',
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch complaints (only when authenticated)
  const fetchComplaints = async (limit = 50, offset = 0) => {
    setLoadingComplaints(true);
    try {
      const url = `/api/complaints?limit=${limit}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load complaints');
      const json = await res.json();
      const list: Complaint[] = json.complaints || [];
      setComplaints(list);
      setFilteredComplaints(list);

      // compute simple stats
      const total = list.length;
      const pending = list.filter((c) => c.status === 'submitted' || c.status === 'in_progress').length;
      const resolved = list.filter((c) => c.status === 'resolved').length;
      const today = list.filter((c) => {
        const d = new Date(c.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
      }).length;

      setStats({
        total_complaints: total,
        pending_complaints: pending,
        resolved_complaints: resolved,
        today_complaints: today,
      });
    } catch (err) {
      console.error('Load complaints error', err);
      toast({ title: 'Error', description: 'Unable to load complaints', variant: 'destructive' });
    } finally {
      setLoadingComplaints(false);
    }
  };

  // init: if user present, fetch complaints
  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // view details by token (opens modal)
  const openDetails = async (token: string) => {
    setDetailsOpen(true);
    setSelectedComplaint(null);
    setDetailsLoading(true);

    try {
      const res = await fetch(`/api/complaints/${encodeURIComponent(token)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Complaint not found');
        }
        throw new Error('Failed to fetch complaint details');
      }
      const data = await res.json();
      setSelectedComplaint(data);
    } catch (err) {
      console.error('Details fetch error', err);
      toast({ title: 'Error', description: (err as Error).message || 'Unable to load details', variant: 'destructive' });
      setDetailsOpen(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  // submit to portal
  const submitToPortal = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/submit/pmc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_id: complaintId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to enqueue submission');
      }
      const json = await res.json();
      toast({ title: 'Submitted to portal', description: `Job ID: ${json.job_id}` });
      // you may want to refresh the list or update that complaint's status
      fetchComplaints();
    } catch (err) {
      console.error('Submit portal error', err);
      toast({ title: 'Submit Failed', description: (err as Error).message || 'Try again', variant: 'destructive' });
    }
  };

  // sign out handler
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({ title: 'Signed out' });
  };

  // derived small helpers
  const displayEmail = useMemo(() => user?.email || '—', [user]);

  // If still checking auth, show spinner; if not authenticated render AdminAuth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return <AdminAuth />;
  }

  // Main admin UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Pune Pulse Admin</h1>
              <p className="text-sm text-gray-500">Civic Complaint Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{displayEmail}</p>
              <p className="text-xs text-gray-500">System Administrator</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_complaints}</p>
                      <p className="text-sm font-medium text-gray-500">Total Complaints</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.pending_complaints}</p>
                      <p className="text-sm font-medium text-gray-500">Pending</p>
                    </div>
                    <Calendar className="w-8 h-8 text-yellow-600" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.resolved_complaints}</p>
                      <p className="text-sm font-medium text-gray-500">Resolved</p>
                    </div>
                    <Users className="w-8 h-8 text-green-600" />
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.today_complaints}</p>
                      <p className="text-sm font-medium text-gray-500">Today</p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-600" />
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Complaints */}
          <TabsContent value="complaints" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search by token, description, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="roads">Roads</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                    <SelectItem value="urban">Urban</SelectItem>
                    <SelectItem value="welfare">Welfare</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={() => fetchComplaints()}>
                  <Download className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </Card>

            <Card>
              <div className="divide-y divide-gray-200">
                {loadingComplaints && (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-gray-600">Loading complaints...</p>
                  </div>
                )}

                {!loadingComplaints && filteredComplaints.map((c) => (
                  <div key={c.id} className="p-6 hover:bg-gray-50 flex items-start justify-between">
                    <div className="flex-1 pr-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="font-mono text-sm font-medium text-blue-600">{c.token}</span>
                        <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        <Badge className={getUrgencyColor(c.urgency || 'medium')} variant="outline">{c.urgency || 'medium'}</Badge>
                      </div>
                      <p className="text-gray-900 mb-2">{c.description}</p>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="capitalize">{c.category} - {c.subtype}</span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          Ward {c.ward_number ?? '—'}
                        </span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => openDetails(c.token)}>View Details</Button>
                      <Button size="sm" onClick={() => submitToPortal(c.id)}>Submit to Portal</Button>
                    </div>
                  </div>
                ))}

                {!loadingComplaints && filteredComplaints.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No complaints found matching your criteria</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Map view (simple list + open-in-map links) */}
          <TabsContent value="map">
            <Card className="p-6">
              <h3 className="text-lg font-medium mb-4">Map / Geo Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.map((c) => (
                  <div key={c.id} className="p-4 border rounded">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-sm font-medium text-blue-600">{c.token}</div>
                        <div className="text-sm text-gray-700">{c.location_text ?? 'No coordinates'}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetails(c.token)}>Details</Button>
                        {/* if location_text contains lat,lng or attachments contain location we might link to maps */}
                        <a
                          className="text-xs text-blue-600 underline"
                          href={
                            c.location_text && c.location_text.includes(',')
                              ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(c.location_text)}`
                              : '#'
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in map
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
                {complaints.length === 0 && <div className="text-gray-500">No geo data available</div>}
              </div>
            </Card>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Category Distribution</h3>
                <div className="text-center text-gray-500">Charts coming soon</div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-medium mb-4">Resolution Timeline</h3>
                <div className="text-center text-gray-500">Charts coming soon</div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details modal (simple inline modal) */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-white rounded shadow-lg overflow-auto max-h-[90vh]">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Complaint Details</h3>
              <div>
                <Button variant="ghost" onClick={() => setDetailsOpen(false)}>Close</Button>
              </div>
            </div>

            <div className="p-6">
              {detailsLoading && (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
                  <p>Loading details...</p>
                </div>
              )}

              {!detailsLoading && selectedComplaint && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold">{selectedComplaint.token}</h4>
                      <div className="text-sm text-gray-500">{selectedComplaint.category} • {selectedComplaint.subtype}</div>
                    </div>

                    <div className="text-right text-sm text-gray-500">
                      <div>Created: {new Date(selectedComplaint.created_at).toLocaleString()}</div>
                      <div>Updated: {new Date(selectedComplaint.updated_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-sm text-gray-600 mb-1">Description</h5>
                    <p className="text-gray-700">{selectedComplaint.description}</p>
                  </div>

                  {selectedComplaint.location_text && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Location</h5>
                      <p className="text-gray-700">{selectedComplaint.location_text}</p>
                    </div>
                  )}

                  {Array.isArray(selectedComplaint.attachments) && selectedComplaint.attachments.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Attachments</h5>
                      <div className="flex gap-2 flex-wrap">
                        {selectedComplaint.attachments.map((a: string, idx: number) => (
                          <a
                            key={idx}
                            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_STORAGE_BUCKET}/${encodeURIComponent(a)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 underline"
                          >
                            View Attachment {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedComplaint.audit_logs && selectedComplaint.audit_logs.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Activity</h5>
                      <div className="space-y-2">
                        {selectedComplaint.audit_logs.map((log, i) => (
                          <div key={i} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <div className="font-medium">{log.action}</div>
                            <div className="text-xs">{new Date(log.created_at).toLocaleString()}</div>
                            {log.payload && <pre className="text-xs mt-1 overflow-x-auto">{JSON.stringify(log.payload, null, 2)}</pre>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-2">
                    <Button onClick={() => selectedComplaint && submitToPortal(selectedComplaint.id)}>Submit to Portal</Button>
                    <Button variant="outline" onClick={() => { /* open edit screen - stub */ toast({ title: 'Edit', description: 'Edit flow not implemented yet' }); }}>
                      Edit
                    </Button>
                  </div>
                </div>
              )}

              {!detailsLoading && !selectedComplaint && (
                <div className="text-center text-gray-500 py-8">No details available</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
