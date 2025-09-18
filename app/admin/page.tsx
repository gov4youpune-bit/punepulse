'use client';
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Shield, Users, FileText, MapPin, Calendar, Download, Search, ArrowLeft, ExternalLink, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Types
interface DashboardStats {
  total_complaints: number;
  pending_complaints: number;
  resolved_complaints: number;
  today_complaints: number;
}

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
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-square bg-red-50 rounded-lg flex items-center justify-center p-2">
        <div className="text-center text-red-600 text-xs">
          <div>Error loading</div>
          <div>Attachment {index + 1}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
      {signedUrl && (
        <img
          src={signedUrl}
          alt={`Attachment ${index + 1}`}
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
  location_text?: string | null;
  location_point?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  ward_number?: number;
  urgency?: string;
  attachments?: string[];
  submitted_to_portal?: any;
  audit_logs?: any[];
  // Worker assignment fields
  assigned_to?: string | null;
  assigned_at?: string | null;
  verification_status?: 'none' | 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  verified_by?: string | null;
  // Assignment history and worker reports
  complaint_assignments?: Array<{
    id: string;
    created_at: string;
    note?: string;
    workers?: {
      name: string;
      email: string;
    };
  }>;
  worker_reports?: Array<{
    id: string;
    comments?: string;
    photos: string[];
    status: string;
    created_at: string;
    workers?: {
      name: string;
      email: string;
    };
  }>;
  // local UI fields
  _selected?: boolean;
  _group?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export default function AdminDashboard() {
  // auth / clerk
  const { user, isLoaded } = useUser();
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
  
  // assignment state
  const [workers, setWorkers] = useState<any[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedComplaintForAssign, setSelectedComplaintForAssign] = useState<Complaint | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [submittingToPortal, setSubmittingToPortal] = useState<string | null>(null);

  // worker reports state
  const [workerReports, setWorkerReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // bulk selection
  const [selectAll, setSelectAll] = useState(false);
  const selectedCount = useMemo(() => complaints.filter(c => c._selected).length, [complaints]);

  // details modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // map ref
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null); // leaflet map instance
  const markersRef = useRef<any[]>([]);

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
    switch (urgency?.toLowerCase()) {
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
        (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((c.location_text || '') as string).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    setFilteredComplaints(filtered);
  }, [complaints, searchTerm, statusFilter, categoryFilter]);

  // fetch worker reports
  const fetchWorkerReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch('/api/complaints/reports');
      if (!res.ok) throw new Error('Failed to load worker reports');
      const data = await res.json();
      setWorkerReports(data.reports || []);
    } catch (err) {
      console.error('Load worker reports error', err);
      toast({ title: 'Error', description: 'Unable to load worker reports', variant: 'destructive' });
    } finally {
      setLoadingReports(false);
    }
  };

  // fetch complaints (only when authenticated)
  const fetchComplaints = async (limit = 200, offset = 0) => {
    setLoadingComplaints(true);
    try {
      const url = `/api/complaints?limit=${limit}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load complaints');
      const json = await res.json();
      const list: Complaint[] = (json.complaints || []).map((c: any) => {
        return { ...c, _selected: false, _group: null };
      });
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

  // fetch workers
  const fetchWorkers = async () => {
    try {
      const res = await fetch('/api/workers');
      if (!res.ok) throw new Error('Failed to load workers');
      const data = await res.json();
      setWorkers(data.workers || []);
    } catch (err) {
      console.error('Load workers error', err);
      toast({ title: 'Error', description: 'Unable to load workers', variant: 'destructive' });
    }
  };

  // init: if user present, fetch complaints and workers
  useEffect(() => {
    if (isLoaded && user) {
      fetchComplaints();
      fetchWorkers();
      fetchWorkerReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user]);

  // view details by token (opens modal)
  const openDetails = useCallback(async (token: string) => {
    setDetailsOpen(true);
    setSelectedComplaint(null);
    setDetailsLoading(true);

    try {
      // FIX: fetch by token route
      const res = await fetch(`/api/complaints/by-token/${encodeURIComponent(token)}`);
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
  }, [toast]);

  // submit to portal
  const submitToPortal = async (complaintId: string) => {
    setSubmittingToPortal(complaintId);
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
      // refresh
      fetchComplaints();
    } catch (err) {
      console.error('Submit portal error', err);
      toast({ title: 'Submit Failed', description: (err as Error).message || 'Try again', variant: 'destructive' });
    } finally {
      setSubmittingToPortal(null);
    }
  };


  // Handle tab changes for map
  useEffect(() => {
    if (activeTab === 'city-map' && mapRef.current) {
      // Invalidate size when switching to map tab
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 100);
    }
  }, [activeTab]);

  // Map: lazy-load Leaflet (CDN) and render markers
  useEffect(() => {
    // Only initialize map when visiting City Map tab
    if (activeTab !== 'city-map') return;

    const loadLeaflet = async () => {
      try {
        if (typeof window === 'undefined') return;
        // ensure CSS present
        if (!document.querySelector('link#leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }
        // load script if not loaded
        if (!(window as any).L) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load Leaflet'));
            document.body.appendChild(s);
          });
        }

        const L = (window as any).L;
        if (!mapRef.current && mapContainerRef.current) {
          mapRef.current = L.map(mapContainerRef.current).setView([18.5204, 73.8567], 12); // Pune center
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(mapRef.current);
        }

        // Invalidate size to ensure proper rendering
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.invalidateSize();
          }
        }, 200);

        // clear previous markers
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];

        // add markers for complaints with coords
        const coords = complaints.filter(c => typeof c.lat === 'number' && typeof c.lng === 'number');
        coords.forEach((c) => {
          const marker = L.marker([c.lat as number, c.lng as number]).addTo(mapRef.current);
          
          // Create popup content with better styling
          const popupContent = `
            <div style="max-width:260px; padding:8px;">
              <div style="font-weight:bold; color:#1f2937; margin-bottom:4px;">${c.token}</div>
              <div style="color:#6b7280; font-size:12px; margin-bottom:6px;">
                ${(c.category || '')} - ${(c.subtype || '')}
              </div>
              <button 
                id="open-${c.token}" 
                style="
                  width:100%; 
                  padding:6px 12px; 
                  border-radius:6px; 
                  background:#2563eb; 
                  color:white; 
                  border:none; 
                  cursor:pointer; 
                  font-size:12px;
                  font-weight:500;
                "
                onmouseover="this.style.background='#1d4ed8'"
                onmouseout="this.style.background='#2563eb'"
              >
                View Details
              </button>
            </div>
          `;
          
          marker.bindPopup(popupContent, { 
            autoPan: true, 
            maxWidth: 260,
            className: 'custom-popup'
          });
          
          // Use marker click instead of popup button to open details modal
          marker.on('click', () => {
            openDetails(c.token);
          });
          
          markersRef.current.push(marker);
        });

        // if there are markers fit bounds, otherwise center on Pune
        if (markersRef.current.length > 0) {
          const group = L.featureGroup(markersRef.current);
          mapRef.current.fitBounds(group.getBounds().pad(0.2));
        } else {
          // Fallback to Pune center if no markers
          mapRef.current.setView([18.5204, 73.8567], 12);
        }
      } catch (err) {
        console.error('Map load error', err);
        toast({ title: 'Map error', description: 'Could not load interactive map. Check network or CDN.', variant: 'destructive' });
      }
    };

    loadLeaflet();
    // rebuild when complaints change
  }, [activeTab, complaints, toast, openDetails]);

  // derived small helpers

  // ---- Bulk selection handlers ----
  const toggleSelectAll = (value: boolean) => {
    setSelectAll(value);
    setComplaints(prev => prev.map(c => ({ ...c, _selected: value })));
  };

  const toggleSelectOne = (id: string, value: boolean) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, _selected: value } : c));
  };

  const performBulkAction = async (action: 'delete' | 'set_urgency' | 'group', payload?: any) => {
    const selected = complaints.filter(c => c._selected);
    if (selected.length === 0) {
      toast({ title: 'No selection', description: 'Select complaints first', variant: 'destructive' });
      return;
    }

    // confirmation for delete
    if (action === 'delete') {
      const confirmDelete = confirm(`Delete ${selected.length} complaint(s)? This cannot be undone.`);
      if (!confirmDelete) return;
      setIsBulkDeleting(true);
    }

    // optimistic local update
    if (action === 'set_urgency') {
      const newUrgency = payload?.urgency;
      setComplaints(prev => prev.map(c => c._selected ? { ...c, urgency: newUrgency } : c));
    } else if (action === 'group') {
      const groupName = payload?.group;
      setComplaints(prev => prev.map(c => c._selected ? { ...c, group_name: groupName } : c));
    } else if (action === 'delete') {
      setComplaints(prev => prev.filter(c => !c._selected));
    }

    // call backend to perform action
    try {
      const res = await fetch('/api/complaints/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selected.map(s => s.id),
          payload
        })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Bulk action failed');
      }
      const json = await res.json();
      
      if (json.success) {
        toast({ title: 'Bulk action complete', description: json.message || 'Action completed successfully' });
        // Refresh from server to ensure canonical state
      fetchComplaints();
      } else {
        toast({ 
          title: 'Bulk action partial success', 
          description: json.message || 'Some operations failed',
          variant: 'warning'
        });
        // Refresh to sync with server state
        fetchComplaints();
      }
    } catch (err) {
      console.error('Bulk action failed', err);
      toast({ 
        title: 'Bulk action failed', 
        description: err instanceof Error ? err.message : 'Failed to perform bulk action', 
        variant: 'destructive' 
      });
      // Revert optimistic update
      fetchComplaints();
    } finally {
      if (action === 'delete') {
        setIsBulkDeleting(false);
      }
    }
  };

  // bulk delete helper to call explicit endpoint if available

  
  const bulkDelete = () => performBulkAction('delete');

  // change selected priority (urgency)
  const setPriorityForSelected = (urgency: string) => performBulkAction('set_urgency', { urgency });

  // group selected complaints
  const groupSelected = async () => {
    const name = prompt('Enter group/folder name for selected complaints:');
    if (!name) return;
    performBulkAction('group', { group: name });
  };

  // ---- Single-item update (calls the update API) ----
  const updateComplaintField = async (id: string, patch: Record<string, any>) => {
    // optimistic update locally
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      const res = await fetch('/api/complaints/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Update failed');
      }
      const data = await res.json();
      // Update with server response
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, ...data.complaint } : c));
      toast({ title: 'Updated', description: 'Complaint updated successfully' });
    } catch (err) {
      console.error('Update failed', err);
      toast({ 
        title: 'Update Failed', 
        description: err instanceof Error ? err.message : 'Failed to update complaint', 
        variant: 'destructive' 
      });
      // Revert optimistic update
      fetchComplaints();
    }
  };

  // ---- Assignment functions ----
  const openAssignDialog = (complaint: Complaint) => {
    setSelectedComplaintForAssign(complaint);
    setSelectedWorkerId('');
    setAssignmentNote('');
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedComplaintForAssign || !selectedWorkerId) return;

    setIsAssigning(true);
    try {
      // Find the selected worker to get their clerk_user_id
      const selectedWorker = workers.find(w => w.id === selectedWorkerId);
      if (!selectedWorker) {
        throw new Error('Selected worker not found');
      }

      const res = await fetch('/api/complaints/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: selectedComplaintForAssign.id,
          assigned_to_worker_id: selectedWorkerId,
          assigned_to_clerk_id: selectedWorker.clerk_user_id,
          note: assignmentNote.trim() || null
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Assignment failed');
      }

      const data = await res.json();
      
      // Update complaint in state
      setComplaints(prev => prev.map(c => 
        c.id === selectedComplaintForAssign.id 
          ? { ...c, ...data.complaint }
          : c
      ));

      toast({ 
        title: 'Assigned', 
        description: `Complaint assigned to ${data.assignment.worker?.name || 'worker'} successfully` 
      });

      setAssignDialogOpen(false);
      setSelectedComplaintForAssign(null);
    } catch (err) {
      console.error('Assignment failed', err);
      toast({ 
        title: 'Assignment Failed', 
        description: err instanceof Error ? err.message : 'Failed to assign complaint', 
        variant: 'destructive' 
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // ---- Verification functions ----
  const handleVerify = async (complaintId: string, reportId?: string, action: 'verify' | 'reject' = 'verify') => {
    try {
      const res = await fetch('/api/complaints/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: complaintId,
          report_id: reportId,
          action
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await res.json();
      
      // Update complaint in state
      setComplaints(prev => prev.map(c => 
        c.id === complaintId 
          ? { ...c, ...data.complaint }
          : c
      ));

      // Update selected complaint if it's the same
      if (selectedComplaint?.id === complaintId) {
        setSelectedComplaint({ ...selectedComplaint, ...data.complaint });
      }

      toast({ 
        title: action === 'verify' ? 'Verified' : 'Rejected', 
        description: `Complaint ${action === 'verify' ? 'verified' : 'rejected'} successfully` 
      });

      // Refresh details if modal is open
      if (selectedComplaint?.id === complaintId) {
        openDetails(selectedComplaint.token);
      }
    } catch (err) {
      console.error('Verification failed', err);
      toast({ 
        title: 'Verification Failed', 
        description: err instanceof Error ? err.message : 'Failed to verify complaint', 
        variant: 'destructive' 
      });
    }
  };

  // If still checking auth, show spinner; if not authenticated show message
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
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Access Required</h1>
          <p className="text-gray-600 mb-8">Please sign in to access the admin dashboard.</p>
          <SignInButton mode="modal">
            <Button>Sign In with Clerk</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // Main admin UI
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Leaflet CSS fixes */}
      <style jsx global>{`
        .leaflet-container .leaflet-popup {
          z-index: 99999 !important;
        }
        .leaflet-container .leaflet-popup-pane {
          z-index: 99999 !important;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
      `}</style>
      
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
              <p className="text-sm font-medium text-gray-900">{user.emailAddresses[0]?.emailAddress}</p>
              <p className="text-xs text-gray-500">System Administrator</p>
            </div>
            <SignOutButton>
              <Button variant="outline" size="sm">Sign Out</Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="worker-replies">Worker Replies</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="city-map">City Map</TabsTrigger>
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

              {/* Bulk toolbar */}
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" checked={selectAll} onChange={(e) => toggleSelectAll(e.target.checked)} />
                    <span className="text-sm">Select all</span>
                  </label>
                  <span className="text-sm text-gray-500">{selectedCount} selected</span>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(val) => val && setPriorityForSelected(val)}
                    defaultValue=""
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Set priority for selected" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={groupSelected}>Group Selected</Button>
                  <Button variant="destructive" onClick={bulkDelete} disabled={isBulkDeleting}>
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                      </>
                    )}
                  </Button>
                </div>
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
                        <input
                          type="checkbox"
                          checked={!!c._selected}
                          onChange={(e) => toggleSelectOne(c.id, e.target.checked)}
                        />
                        <span className="font-mono text-sm font-medium text-blue-600">{c.token}</span>
                        <Badge className={getStatusColor(c.status)}>{c.status}</Badge>
                        <Badge className={getUrgencyColor(c.urgency || 'medium')} variant="outline">
                          <Select
                            onValueChange={(val) => updateComplaintField(c.id, { urgency: val })}
                            defaultValue={c.urgency || 'medium'}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder={c.urgency || 'medium'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">high</SelectItem>
                              <SelectItem value="medium">medium</SelectItem>
                              <SelectItem value="low">low</SelectItem>
                            </SelectContent>
                          </Select>
                        </Badge>
                      </div>
                      <p className="text-gray-900 mb-2">{c.description}</p>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="capitalize">{c.category} - {c.subtype}</span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {c.location_text ? (
                            <span title={c.location_text}>
                              {c.location_text.length > 30 ? `${c.location_text.substring(0, 30)}...` : c.location_text}
                            </span>
                          ) : (
                            <span>No location</span>
                          )}
                        </span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                        {c._group && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">Group: {c._group}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="sm" onClick={() => openDetails(c.token)}>View Details</Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(c)}>Assign</Button>
                      <Button 
                        size="sm" 
                        onClick={() => submitToPortal(c.id)}
                        disabled={submittingToPortal === c.id}
                      >
                        {submittingToPortal === c.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit to Portal'
                        )}
                      </Button>
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

          {/* Worker Replies */}
          <TabsContent value="worker-replies" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Worker Reports</h3>
                <Button variant="outline" onClick={fetchWorkerReports}>
                  <Download className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {loadingReports ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-gray-600">Loading worker reports...</p>
                </div>
              ) : workerReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No worker reports pending review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workerReports.map((report) => (
                    <Card key={report.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-sm font-medium text-blue-600">
                              {report.complaint?.token}
                            </span>
                            <Badge className={getStatusColor(report.status)}>
                              {report.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Report by {report.worker?.display_name || 'Unknown Worker'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleVerify(report.complaint_id, report.id, 'verify')}
                            className="text-xs"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleVerify(report.complaint_id, report.id, 'reject')}
                            className="text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>

                      {report.comments && (
                        <div className="mb-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-700">{report.comments}</p>
                        </div>
                      )}

                      {report.photos && report.photos.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-900 mb-2">
                            Worker Photos ({report.photos.length})
                          </h5>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {report.photos.map((photoKey: string, index: number) => (
                              <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                  src={`/api/attachments/public?key=${encodeURIComponent(photoKey)}`}
                                  alt={`Worker photo ${index + 1}`}
                                  className="w-full h-full object-cover cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(`/api/attachments/public?key=${encodeURIComponent(photoKey)}`, '_blank')}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        Complaint: {report.complaint?.category} - {report.complaint?.subtype}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
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
                        <div className="text-sm text-gray-700">
                          {c.location_text ? (
                            <div>
                              <div className="font-medium">Address:</div>
                              <div className="text-xs">{c.location_text}</div>
                              {c.location_point && (
                                <div className="text-xs text-gray-500 mt-1">
                                  GPS: {c.location_point}
                                </div>
                              )}
                            </div>
                          ) : (
                            'No location data'
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => openDetails(c.token)}>Details</Button>
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

          {/* Consolidated City Map -> interactive Leaflet */}
          <TabsContent value="city-map">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">City Map — Consolidated Complaints</h3>
                <div className="text-sm text-gray-500">{complaints.filter(c => c.lat && c.lng).length} plotted</div>
              </div>

              <div ref={mapContainerRef} id="city-map-container" style={{ height: 600 }} className="border rounded" />
              <p className="text-xs text-gray-500 mt-2">Markers show complaints with coordinates. Click a marker → “View Details” to open details modal.</p>
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
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedComplaint.description}</p>
                  </div>

                  {(selectedComplaint.location_text || selectedComplaint.location_point) && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Location</h5>
                      <div className="space-y-1">
                        {selectedComplaint.location_text && (
                          <p className="text-gray-700">
                            <span className="font-medium">Address:</span> {selectedComplaint.location_text}
                          </p>
                        )}
                        {selectedComplaint.location_point && (
                          <p className="text-gray-700">
                            <span className="font-medium">GPS Coordinates:</span> {selectedComplaint.location_point}
                          </p>
                        )}
                        {(selectedComplaint.location_text || selectedComplaint.location_point) && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedComplaint.location_point || selectedComplaint.location_text || '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            Open in Google Maps
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedComplaint.attachments) && selectedComplaint.attachments.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Attachments</h5>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedComplaint.attachments.map((a: string, idx: number) => (
                          <AttachmentViewer key={idx} attachmentKey={a} index={idx} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignment History */}
                  {selectedComplaint.complaint_assignments && selectedComplaint.complaint_assignments.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Assignment History</h5>
                      <div className="space-y-2">
                        {selectedComplaint.complaint_assignments.map((assignment: any, i: number) => (
                          <div key={i} className="text-xs text-gray-600 bg-blue-50 p-3 rounded border">
                            <div className="font-medium text-blue-900">
                              Assigned to {assignment.workers?.name || 'Unknown Worker'}
                            </div>
                            <div className="text-blue-700 text-xs">
                              {new Date(assignment.created_at).toLocaleString()}
                            </div>
                            {assignment.note && (
                              <div className="text-blue-600 mt-1 italic">&ldquo;{assignment.note}&rdquo;</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Worker Reports */}
                  {selectedComplaint.worker_reports && selectedComplaint.worker_reports.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-1">Worker Reports</h5>
                      <div className="space-y-3">
                        {selectedComplaint.worker_reports.map((report: any, i: number) => (
                          <div key={i} className="text-xs text-gray-600 bg-green-50 p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium text-green-900">
                                Report by {report.workers?.name || 'Unknown Worker'}
                              </div>
                              <Badge className={report.status === 'verified' ? 'bg-green-100 text-green-800' : 
                                              report.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                              'bg-yellow-100 text-yellow-800'}>
                                {report.status}
                              </Badge>
                            </div>
                            <div className="text-green-700 text-xs mb-2">
                              {new Date(report.created_at).toLocaleString()}
                            </div>
                            {report.comments && (
                              <div className="text-green-600 mb-2 italic">&ldquo;{report.comments}&rdquo;</div>
                            )}
                            {report.photos && report.photos.length > 0 && (
                              <div className="grid grid-cols-2 gap-2">
                                {report.photos.map((photoKey: string, photoIdx: number) => (
                                  <AttachmentViewer key={photoIdx} attachmentKey={photoKey} index={photoIdx} />
                                ))}
                              </div>
                            )}
                            {selectedComplaint.verification_status === 'pending' && (
                              <div className="flex gap-2 mt-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleVerify(selectedComplaint.id, report.id, 'verify')}
                                  className="text-xs"
                                >
                                  Verify
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleVerify(selectedComplaint.id, report.id, 'reject')}
                                  className="text-xs"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
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
                    <Button 
                      onClick={() => selectedComplaint && submitToPortal(selectedComplaint.id)}
                      disabled={selectedComplaint && submittingToPortal === selectedComplaint.id}
                    >
                      {selectedComplaint && submittingToPortal === selectedComplaint.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit to Portal'
                      )}
                    </Button>
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

      {/* Assignment Dialog */}
      {assignDialogOpen && selectedComplaintForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded shadow-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-medium">Assign Complaint</h3>
              <Button variant="ghost" onClick={() => setAssignDialogOpen(false)}>Close</Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label className="text-sm font-medium">Complaint</Label>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedComplaintForAssign.token} - {selectedComplaintForAssign.category}
                </div>
              </div>

              <div>
                <Label htmlFor="worker-select" className="text-sm font-medium">Assign to Worker</Label>
                <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {workers.map(worker => (
                      <SelectItem key={worker.id} value={worker.id}>
                        {worker.display_name} ({worker.email || 'No email'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assignment-note" className="text-sm font-medium">Note (Optional)</Label>
                <Textarea
                  id="assignment-note"
                  placeholder="Add a note for the worker..."
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleAssign} disabled={!selectedWorkerId || isAssigning}>
                  {isAssigning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign'
                  )}
                </Button>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={isAssigning}>
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
