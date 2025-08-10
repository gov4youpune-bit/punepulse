'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Camera, RotateCcw, Check, X, Upload, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useComplaintStore } from '@/store/complaint-store';

interface CameraCaptureProps {
  onNext: () => void;
  onBack: () => void;
}

export function CameraCapture({ onNext, onBack }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { setImages } = useComplaintStore();

  // startCamera doesn't reference `stream` state directly (cleanup handles stopping)
  const startCamera = useCallback(async (facing: 'user' | 'environment' = 'environment') => {
    try {
      setError(null);
      setIsLoading(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      setFacingMode(facing);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied. Please allow camera access and refresh.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ensure startCamera is included in deps
  useEffect(() => {
    startCamera();
    return () => {
      // Stop any active stream from the video element (most robust)
      const s = videoRef.current?.srcObject as MediaStream | null;
      if (s) {
        s.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const captureImage = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current ?? document.createElement('canvas');

    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);

    // Stop camera stream after capture (use video.srcObject)
    const s = video.srcObject as MediaStream | null;
    if (s) {
      s.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      setStream(null);
    }
  }, []);

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  const switchCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(newFacing);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert data URL to File object
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `complaint-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setImages([file]);
          onNext();
        })
        .catch(err => {
          console.error('Failed to convert captured image to file', err);
        });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      // Convert first file to data URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
      };
      reader.readAsDataURL(files[0]);

      setImages(files);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="relative z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between text-white">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <h1 className="font-semibold">Capture Photo</h1>
          <div></div>
        </div>
      </div>

      {error && (
        <div className="absolute top-20 left-4 right-4 z-20">
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-red-700 text-sm mb-3">{error}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => startCamera()}>
                Retry Camera
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Choose File
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Camera View */}
      <div className="relative flex-1">
        {!capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-screen object-cover"
            />

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-center space-x-8">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={switchCamera}
                  className="text-white hover:bg-white/10 w-12 h-12 rounded-full p-0"
                  disabled={isLoading}
                >
                  <RotateCcw className="w-6 h-6" />
                </Button>

                <Button
                  size="lg"
                  onClick={captureImage}
                  disabled={isLoading || !stream}
                  className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 text-black p-0"
                >
                  <Camera className="w-8 h-8" />
                </Button>

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-white hover:bg-white/10 w-12 h-12 rounded-full p-0"
                >
                  <Upload className="w-6 h-6" />
                </Button>
              </div>

              <p className="text-white/80 text-center mt-4 text-sm">
                Tap to capture or upload photo of the issue
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-full h-screen relative">
              <Image
                src={capturedImage}
                alt="Captured complaint"
                fill
                style={{ objectFit: 'cover' }}
                sizes="(max-width: 768px) 100vw, 100vw"
              />
            </div>

            {/* Confirm Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
              <div className="flex items-center justify-center space-x-8">
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={retakePhoto}
                  className="text-white hover:bg-white/10 border border-white/20"
                >
                  <X className="w-5 h-5 mr-2" />
                  Retake
                </Button>

                <Button
                  size="lg"
                  onClick={confirmPhoto}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Use Photo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef as any} className="hidden" />
    </div>
  );
}
