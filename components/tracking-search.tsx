'use client';

import { useState } from 'react';
import { Search, ArrowLeft, MapPin, Calendar, FileText, ExternalLink, Copy, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface TrackingSearchProps {
  onBack: () => void;
}

interface ComplaintStatus {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  status: string;
  location_text: string;
  created_at: string;
  updated_at: string;
  attachments?: string[];
  submitted_to_portal?: {
    portal_token?: string;
    portal_url?: string;
    submitted_at?: string;
  };
  audit_logs?: Array<{
    action: string;
    created_at: string;
    payload?: any;
  }>;
}

export function TrackingSearch({ onBack }: TrackingSearchProps) {
  const [searchToken, setSearchToken] = useState('');
  const [complaint, setComplaint] = useState<ComplaintStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = searchToken.trim();
    if (!token) return;

    setLoading(true);
    setError(null);
    setComplaint(null);

    try {
      const res = await fetch(`/api/complaints/by-token/${encodeURIComponent(token)}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Complaint not found. Please check your tracking token.');
        }
        const txt = await res.text().catch(() => res.statusText);
        throw new Error(`Failed to fetch complaint details (${res.status}): ${txt}`);
      }
      const data = (await res.json()) as ComplaintStatus;
      if (!data || !data.id) {
        throw new Error('Invalid data from server');
      }
      setComplaint(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const openFullPage = (token?: string) => {
    const t = token ?? complaint?.token;
    if (!t) return;
    router.push(`/track/${encodeURIComponent(t)}`);
  };

  const copyToken = async () => {
    if (!complaint?.token) return;
    try {
      await navigator.clipboard.writeText(complaint.token);
      toast({ title: 'Token copied', description: complaint.token });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy token to clipboard', variant: 'destructive' });
    }
  };

  const shareToken = async () => {
    if (!complaint?.token) return;
    const url = `${window.location.origin}/track/${encodeURIComponent(complaint.token)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pune Pulse complaint', text: `Track complaint ${complaint.token}`, url });
      } catch {
        // fallback: copy
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied', description: url });
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: url });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="font-semibold">Track Complaint</h1>
          </div>

          <div className="flex items-center space-x-2">
            {complaint && (
              <>
                <Button size="sm" variant="ghost" onClick={() => openFullPage()}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open full page
                </Button>
                <Button size="sm" variant="ghost" onClick={copyToken}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy token
                </Button>
                <Button size="sm" onClick={shareToken}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Search Form */}
        <Card className="p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="space-y-4">
              <div>
                <label htmlFor="token" className="block text-sm font-medium mb-2">
                  Tracking Token
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="token"
                    placeholder="PMC-123456"
                    value={searchToken}
                    onChange={(e) => setSearchToken(e.target.value.toUpperCase())}
                    className="font-mono"
                    aria-label="Tracking token"
                  />
                  <Button type="submit" disabled={loading || !searchToken.trim()}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the tracking token you received when submitting your complaint
                </p>
              </div>
            </div>
          </form>
        </Card>

        {/* Error */}
        {error && (
          <Card className="p-6 mb-6 border-red-200 bg-red-50">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <Card className="p-6 mb-6">
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Searching for complaint...</p>
            </div>
          </Card>
        )}

        {/* Complaint Details */}
        {complaint && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <button
                    onClick={() => openFullPage()}
                    className="text-left"
                    aria-label="Open full complaint page"
                  >
                    <h2 className="text-xl font-semibold mb-2">
                      Complaint <span className="font-mono">{complaint.token}</span>
                    </h2>
                  </button>
                  <Badge className={getStatusColor(complaint.status)}>
                    {complaint.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>

                <div className="text-right text-sm text-gray-500">
                  <div>Submitted: {formatDate(complaint.created_at)}</div>
                  <div>Updated: {formatDate(complaint.updated_at)}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-gray-500 mb-1">Category</h3>
                  <p className="capitalize">
                    {complaint.category} {complaint.subtype ? `— ${complaint.subtype}` : ''}
                  </p>
                </div>
                {complaint.location_text && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Location</h3>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{complaint.location_text}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{complaint.description}</p>
              </div>
            </Card>

            {/* Portal Submission */}
            {complaint.submitted_to_portal?.portal_token && (
              <Card className="p-6">
                <h3 className="font-medium mb-4 flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Portal Submission
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Portal Token:</span>
                    <span className="font-mono text-sm">
                      {complaint.submitted_to_portal.portal_token}
                    </span>
                  </div>

                  {complaint.submitted_to_portal.submitted_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Submitted:</span>
                      <span className="text-sm">
                        {formatDate(complaint.submitted_to_portal.submitted_at)}
                      </span>
                    </div>
                  )}

                  {complaint.submitted_to_portal.portal_url && (
                    <div className="pt-2">
                      <a
                        href={complaint.submitted_to_portal.portal_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" asChild>
                          <span className="flex items-center">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on PMC Portal
                          </span>
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Activity Timeline */}
            {complaint.audit_logs && complaint.audit_logs.length > 0 && (
              <Card className="p-6">
                <h3 className="font-medium mb-4 flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Activity Timeline
                </h3>

                <div className="space-y-3">
                  {complaint.audit_logs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{log.action.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{formatDate(log.created_at)}</p>
                        {log.payload && Object.keys(log.payload).length > 0 && (
                          <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Help Text */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Next Steps:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Your complaint has been registered with PMC</li>
                    <li>You will receive updates if an email was provided</li>
                    <li>For urgent issues, contact PMC directly at 020-2612-2122</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
