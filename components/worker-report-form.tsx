'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Camera, X, Upload, Loader2, CheckCircle } from 'lucide-react';
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setPhotos(prev => [...prev, ...newFiles]);
    
    // Create preview URLs
    const newUrls = newFiles.map(file => URL.createObjectURL(file));
    setPhotoUrls(prev => [...prev, ...newUrls]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (photos.length === 0) return [];

    setUploading(true);
    try {
      const uploadPromises = photos.map(async (file) => {
        // Create upload URL
        const uploadRes = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type
          })
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload URL creation failed: ${uploadRes.statusText}`);
        }

        const { uploadUrl, key } = await uploadRes.json();

        // Upload file to Supabase
        const uploadToSupabase = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        });

        if (!uploadToSupabase.ok) {
          throw new Error(`File upload failed: ${uploadToSupabase.statusText}`);
        }

        return key;
      });

      const uploadedKeys = await Promise.all(uploadPromises);
      console.log('[WORKER REPORT] Photos uploaded successfully:', uploadedKeys);
      return uploadedKeys;
    } catch (error) {
      console.error('[WORKER REPORT] Photo upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!comments.trim() && photos.length === 0) {
      toast({
        title: 'Error',
        description: 'Please provide comments or upload photos',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upload photos first
      const uploadedPhotos = await uploadPhotos();

      // Submit report
      const reportData = {
        complaint_id: complaint.id,
        comments: comments.trim(),
        photos: uploadedPhotos
      };

      console.log('[WORKER REPORT] Submitting report:', reportData);

      const response = await fetch('/api/complaints/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }

      const result = await response.json();
      console.log('[WORKER REPORT] Report submitted successfully:', result);

      toast({
        title: 'Success',
        description: 'Report submitted successfully',
        variant: 'default'
      });

      onSubmitted();
    } catch (error: any) {
      console.error('[WORKER REPORT] Submit error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit report',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Submit Worker Report</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Complaint Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Complaint Details</h3>
            <p className="text-sm text-gray-600 mb-1">
              <strong>ID:</strong> {complaint.token}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Category:</strong> {complaint.category} - {complaint.subtype}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Description:</strong> {complaint.description}
            </p>
          </div>

          {/* Comments */}
          <div className="mb-6">
            <Label htmlFor="comments">Comments *</Label>
            <Textarea
              id="comments"
              placeholder="Describe the work done, findings, or any updates..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1"
              rows={4}
            />
          </div>

          {/* Photo Upload */}
          <div className="mb-6">
            <Label>Photos (Optional)</Label>
            <div className="mt-2">
              <input
                type="file"
                id="photos"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photos')?.click()}
                className="w-full"
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Select Photos
                  </>
                )}
              </Button>
            </div>

            {/* Photo Previews */}
            {photoUrls.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {photoUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {photos.length} photo(s) selected
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploading || (!comments.trim() && photos.length === 0)}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}