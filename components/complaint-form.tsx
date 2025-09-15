'use client';

import { useState, useRef } from 'react';
import { ArrowLeft, Send, Loader2, CheckCircle, Copy, Share2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComplaintStore } from '@/store/complaint-store';
import { useToast } from '@/hooks/use-toast';

interface ComplaintFormProps {
  onBack: () => void;
}

const categories = [
  { value: 'roads', label: 'Roads & Transport', subtypes: ['pothole', 'streetlight', 'traffic_signal', 'road_construction'] },
  { value: 'water', label: 'Water Supply', subtypes: ['burst_pipe', 'no_water', 'contaminated_water', 'drainage'] },
  { value: 'power', label: 'Electricity', subtypes: ['no_power', 'transformer', 'power_line'] },
  { value: 'urban', label: 'Urban Services', subtypes: ['garbage', 'stray_animals', 'encroachment', 'air_pollution'] },
  { value: 'welfare', label: 'Public Welfare', subtypes: ['ration_card', 'birth_certificate', 'property_tax'] },
  { value: 'other', label: 'Other Issues', subtypes: ['other'] }
];

const subtypeLabels: Record<string, string> = {
  pothole: 'Pothole/Road Damage',
  streetlight: 'Street Light Issue',
  traffic_signal: 'Traffic Signal Problem',
  road_construction: 'Road Construction',
  burst_pipe: 'Burst Water Pipe',
  no_water: 'No Water Supply',
  contaminated_water: 'Water Quality Issue',
  drainage: 'Drainage Problem',
  no_power: 'Power Outage',
  transformer: 'Transformer Issue',
  power_line: 'Power Line Damage',
  garbage: 'Garbage Collection',
  stray_animals: 'Stray Animals',
  encroachment: 'Illegal Encroachment',
  air_pollution: 'Air Pollution',
  ration_card: 'Ration Card Issue',
  birth_certificate: 'Birth Certificate',
  property_tax: 'Property Tax',
  other: 'Other Issue'
};

interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  key?: string;
  error?: string;
}

export function ComplaintForm({ onBack }: ComplaintFormProps) {
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{token: string; id: string} | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { images, location, setImages } = useComplaintStore();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find(cat => cat.value === category);

  // Image handling functions
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Filter for images only
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      toast({
        title: "Invalid Files",
        description: "Only image files are allowed",
        variant: "destructive"
      });
    }

    if (imageFiles.length > 0) {
      setImages(imageFiles);
      setUploadProgress(imageFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      })));
    }
  };

  const removeImage = (index: number) => {
    const newImages = images?.filter((_, i) => i !== index) || [];
    setImages(newImages);
    setUploadProgress(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!images || images.length === 0) return [];

    setIsUploading(true);
    const attachmentKeys: string[] = [];

    try {
      // Use batch upload if multiple files
      if (images.length > 1) {
        const uploadResponse = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: images.map(img => ({
              filename: img.name,
              contentType: img.type
            }))
          })
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to get upload URLs');
        
        const { uploads } = await uploadResponse.json();
        
        // Upload each file
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
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
      } else {
        // Single file upload
        const image = images[0];
        const uploadResponse = await fetch('/api/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: image.name,
            contentType: image.type
          })
        });
        
        if (!uploadResponse.ok) throw new Error('Failed to get upload URL');
        
        const { uploadUrl, key } = await uploadResponse.json();
        
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === 0 ? { ...item, status: 'uploading', progress: 0 } : item
        ));

        const uploadResult = await fetch(uploadUrl, {
          method: 'PUT',
          body: image,
          headers: { 'Content-Type': image.type }
        });
        
        if (!uploadResult.ok) throw new Error(`Failed to upload ${image.name}`);
        
        attachmentKeys.push(key);
        setUploadProgress(prev => prev.map((item, idx) => 
          idx === 0 ? { ...item, status: 'completed', progress: 100, key } : item
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
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !subtype || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const attachmentKeys = await uploadImages();

      // Submit complaint
      const complaintData = {
        category,
        subtype,
        description: description.trim(),
        lat: location?.lat || null,
        lng: location?.lng || null,
        location_text: location?.address || '',
        email: email.trim() || null,
        attachments: attachmentKeys
      };

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit complaint');
      }

      const result = await response.json();
      setSubmissionResult(result);
      
      toast({
        title: "Complaint Submitted!",
        description: `Your tracking token is ${result.token}`,
      });

      // Redirect to the shareable track page immediately
      router.push(`/track/${encodeURIComponent(result.token)}`);

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyToken = () => {
    if (submissionResult) {
      navigator.clipboard.writeText(submissionResult.token);
      toast({
        title: "Token Copied",
        description: "Tracking token copied to clipboard"
      });
    }
  };

  const handleShare = async () => {
    if (submissionResult && navigator.share) {
      try {
        await navigator.share({
          title: 'Pune Pulse Complaint',
          text: `Complaint submitted successfully. Tracking token: ${submissionResult.token}`,
          url: `${window.location.origin}/track/${submissionResult.token}`
        });
      } catch (err) {
        // Fallback to copy
        handleCopyToken();
      }
    } else {
      handleCopyToken();
    }
  };

  if (submissionResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Complaint Submitted!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Your complaint has been submitted to Pune Municipal Corporation
          </p>
          
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <Label className="text-sm font-medium text-blue-900">Tracking Token</Label>
            <div className="flex items-center justify-between mt-2 bg-white border rounded px-3 py-2">
              <span className="font-mono text-lg font-bold text-blue-600">
                {submissionResult.token}
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
            
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
              Submit Another Complaint
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-6">
            Save your tracking token to check status updates
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-semibold">Complaint Details</h1>
          <div></div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Complaint Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCategory && (
                <div>
                  <Label htmlFor="subtype">Issue Type *</Label>
                  <Select value={subtype} onValueChange={setSubtype}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.subtypes.map(sub => (
                        <SelectItem key={sub} value={sub}>
                          {subtypeLabels[sub]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </Card>

          {/* Description */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the issue in detail. Include any relevant information like time of occurrence, severity, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {description.length}/1000 characters
                </p>
              </div>
            </div>
          </Card>

          {/* Image Upload */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="images">Attach Images (Optional)</Label>
                <div className="mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Images
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    Select multiple images to attach to your complaint
                  </p>
                </div>
              </div>

              {/* Image Previews */}
              {images && images.length > 0 && (
                <div className="space-y-3">
                  <Label>Selected Images ({images.length})</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((image, index) => {
                      const progress = uploadProgress[index];
                      return (
                        <div key={index} className="relative group">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {progress?.status === 'uploading' && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="text-white text-sm">
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                                  Uploading...
                                </div>
                              </div>
                            )}
                            {progress?.status === 'completed' && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                              </div>
                            )}
                            {progress?.status === 'error' && (
                              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                <X className="w-6 h-6 text-red-600" />
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {image.name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <Label>Upload Progress</Label>
                  {uploadProgress.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{item.file.name}</span>
                        <span className="text-gray-500">
                          {item.status === 'uploading' && 'Uploading...'}
                          {item.status === 'completed' && 'Completed'}
                          {item.status === 'error' && 'Failed'}
                        </span>
                      </div>
                      {item.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="text-xs text-red-600">
                          {item.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Contact Info */}
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Provide email to receive status updates
                </p>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-medium mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Images:</span>
                <span>{images?.length || 0} attached</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Location:</span>
                <span>{location?.address ? 'Set' : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span>{category ? selectedCategory?.label : 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Email updates:</span>
                <span>{email ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </Card>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isSubmitting || isUploading || !category || !subtype || !description.trim()}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading Images...
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Submit Complaint
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
