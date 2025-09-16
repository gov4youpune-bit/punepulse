'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Camera, X, Upload, Loader2 } from 'lucide-react';
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
}

interface WorkerReportFormProps {
  complaint: AssignedComplaint;
  onClose: () => void;
  onSubmitted: () => void;
}

export function WorkerReportForm({ complaint, onClose, onSubmitted }: WorkerReportFormProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Create upload URL
        const uploadRes = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            bucket: 'attachments'
          })
        });

        if (!uploadRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, key } = await uploadRes.json();

        // Upload file
        const uploadResult = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadResult.ok) throw new Error('Failed to upload file');
        return key;
      });

      const uploadedKeys = await Promise.all(uploadPromises);
      setPhotos(prev => [...prev, ...uploadedKeys]);
      
      toast({ 
        title: 'Photos Uploaded', 
        description: `Successfully uploaded ${uploadedKeys.length} photo(s)` 
      });
    } catch (err) {
      console.error('Photo upload error:', err);
      toast({ 
        title: 'Upload Failed', 
        description: 'Failed to upload photos. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0 && !comments.trim()) {
      toast({ 
        title: 'Report Required', 
        description: 'Please add photos or comments to your report', 
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/complaints/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint_id: complaint.id,
          comments: comments.trim() || null,
          photos
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit report');
      }

      onSubmitted();
    } catch (err) {
      console.error('Report submission error:', err);
      toast({ 
        title: 'Submission Failed', 
        description: err instanceof Error ? err.message : 'Failed to submit report', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Submit Report</h3>
              <p className="text-sm text-gray-500">{complaint.token} - {complaint.category}</p>
            </div>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Complaint Details */}
          <Card className="p-4">
            <h4 className="font-medium text-gray-900 mb-2">Complaint Details</h4>
            <p className="text-gray-700 text-sm mb-2">{complaint.description}</p>
            {complaint.location_text && (
              <p className="text-gray-500 text-sm">{complaint.location_text}</p>
            )}
          </Card>

          {/* Comments */}
          <div>
            <Label htmlFor="comments" className="text-sm font-medium">
              Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              placeholder="Describe the work completed, issues found, or any additional information..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label className="text-sm font-medium">Photos</Label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
                disabled={uploading}
              />
              <label
                htmlFor="photo-upload"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Add Photos
                  </>
                )}
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Upload photos showing the completed work or current status
              </p>
            </div>

            {/* Photo Preview */}
            {photos.length > 0 && (
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  Uploaded Photos ({photos.length})
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {photos.map((photoKey, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={`/api/attachments/public?key=${encodeURIComponent(photoKey)}`}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={submitting}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={submitting || (photos.length === 0 && !comments.trim())}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
