'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Check, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useComplaintStore } from '@/store/complaint-store';

interface LocationCaptureProps {
  onNext: () => void;
  onBack: () => void;
}

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  address?: string;
}

export function LocationCapture({ onNext, onBack }: LocationCaptureProps) {
  const [location, setLocation] = useState<Location | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useManual, setUseManual] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const { setLocation: setStoreLocation } = useComplaintStore();
  
  // Default location (Pune city center)
  const defaultLocation = { lat: 18.5204, lng: 73.8567 };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setIsLoading(true);
    setError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const newLocation = { 
          lat: latitude, 
          lng: longitude, 
          accuracy 
        };
        
        setLocation(newLocation);
        
        // Try to get address from coordinates
        try {
          const address = await reverseGeocode(latitude, longitude);
          setLocation(prev => prev ? { ...prev, address } : null);
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        }
        
        setIsLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError(`Location access denied: ${error.message}`);
        setLocation(defaultLocation);
        setIsLoading(false);
      },
      options
    );
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    // Using OpenStreetMap Nominatim (free reverse geocoding)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    
    if (!response.ok) throw new Error('Geocoding failed');
    
    const data = await response.json();
    return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const handleConfirm = () => {
    if (useManual && manualAddress.trim()) {
      setStoreLocation({
        lat: null,
        lng: null,
        address: manualAddress.trim()
      });
    } else if (location) {
      setStoreLocation({
        lat: location.lat,
        lng: location.lng,
        address: location.address || `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
      });
    }
    onNext();
  };

  const displayLocation = location || defaultLocation;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-semibold">Add Location</h1>
          <div></div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* GPS Location Card */}
        <Card className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">GPS Location</h3>
                <p className="text-sm text-gray-500">Auto-detected location</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Navigation className="w-4 h-4" />
              )}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {location && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Coordinates:</span>
                <span className="font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>
              {location.accuracy && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Accuracy:</span>
                  <span className="text-green-600">±{Math.round(location.accuracy)}m</span>
                </div>
              )}
              {location.address && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">Address:</p>
                  <p className="text-sm text-gray-600">{location.address}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Manual Location Card */}
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-medium">Manual Location</h3>
              <p className="text-sm text-gray-500">Type address or landmark</p>
            </div>
          </div>

          <Input
            placeholder="Enter street address, landmark, or area name..."
            value={manualAddress}
            onChange={(e) => {
              setManualAddress(e.target.value);
              setUseManual(e.target.value.length > 0);
            }}
            className="mb-2"
          />
          
          <p className="text-xs text-gray-500">
            Example: Near ABC School, XYZ Road, Kothrud, Pune
          </p>
        </Card>

        {/* Map Preview */}
        <Card className="p-4">
          <h3 className="font-medium mb-3">Location Preview</h3>
          <div 
            className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
            ref={mapRef}
          >
            <div className="text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Interactive map would load here</p>
              <p className="text-xs mt-1">
                {useManual && manualAddress
                  ? `Manual: ${manualAddress}`
                  : displayLocation
                  ? `GPS: ${displayLocation.lat.toFixed(4)}, ${displayLocation.lng.toFixed(4)}`
                  : 'No location selected'
                }
              </p>
            </div>
          </div>
        </Card>

        {/* Confirm Button */}
        <div className="pt-4">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleConfirm}
            disabled={!location && !manualAddress.trim()}
          >
            <Check className="w-5 h-5 mr-2" />
            Confirm Location
          </Button>
          
          {(!location && !manualAddress.trim()) && (
            <p className="text-sm text-orange-600 mt-2 text-center">
              Please allow GPS access or enter manual location
            </p>
          )}
        </div>
      </div>
    </div>
  );
}