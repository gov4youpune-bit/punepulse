// src/store/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  role?: string;
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      // Start loading true to avoid flicker; set to false when auth check completes
      loading: true,
      setUser: (user: User | null) => set({ user, loading: false }),
      setLoading: (loading: boolean) => set({ loading }),
      signOut: () => set({ user: null }),
    }),
    {
      name: 'auth-store',
      // Only persist non-sensitive minimal data
      partialize: (state) => ({ user: state.user }),
    }
  )
);
