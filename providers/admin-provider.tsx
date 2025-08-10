'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface AdminProviderProps {
  children: React.ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Mock authentication check - replace with Supabase
    const checkAuth = async () => {
      setLoading(true);
      
      // Simulate checking authentication status
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock user for development
      const mockUser = {
        id: '1',
        email: 'admin@punepulse.dev',
        role: 'admin'
      };
      
      setUser(mockUser);
    };

    checkAuth();
  }, [setUser, setLoading]);

  return <>{children}</>;
}