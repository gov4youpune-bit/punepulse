'use client';

import { useState } from 'react';
import { Shield, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function AdminAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    if (!password || password.length < 6) {
      toast({ title: 'Invalid password', description: 'Please enter a valid password', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signIn error', error);
        
        // Check if it's a password-related error
        if (error.message?.includes('Invalid login credentials') || error.message?.includes('password')) {
          // Check if this is an admin account that needs password setup
          const response = await fetch('/api/admin/set-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          
          if (response.ok) {
            toast({ 
              title: 'Password Set Successfully', 
              description: 'Your password has been set. Please try signing in again.' 
            });
            setPassword(''); // Clear password field
          } else {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 404) {
              toast({ title: 'Account Not Found', description: 'This email is not registered as an admin.', variant: 'destructive' });
            } else if (response.status === 403) {
              toast({ title: 'Access Denied', description: 'This account does not have admin privileges.', variant: 'destructive' });
            } else {
              toast({ title: 'Sign in failed', description: errorData.error || 'Invalid credentials', variant: 'destructive' });
            }
          }
        } else {
          toast({ title: 'Sign in failed', description: error.message || 'Invalid credentials', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Signed in successfully', description: 'Welcome to the admin dashboard' });
        // Redirect will be handled by the auth state change listener
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Unable to sign in', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Sign In</h1>
            <p className="text-gray-600">Sign in with your admin credentials. If this is your first time, the password will be set automatically.</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@punepulse.dev"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">Only authorized personnel should sign in here.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
