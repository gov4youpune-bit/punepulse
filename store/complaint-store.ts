import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Location {
  lat: number | null;
  lng: number | null;
  address?: string;
}

interface ComplaintStore {
  images: File[] | null;
  location: Location | null;
  setImages: (images: File[]) => void;
  setLocation: (location: Location) => void;
  reset: () => void;
}

export const useComplaintStore = create<ComplaintStore>()(
  persist(
    (set) => ({
      images: null,
      location: null,
      setImages: (images) => set({ images }),
      setLocation: (location) => set({ location }),
      reset: () => set({ images: null, location: null }),
    }),
    {
      name: 'complaint-store',
      // Don't persist File objects, only metadata
      partialize: (state) => ({
        location: state.location,
        // Images will be re-captured if needed
      }),
    }
  )
);