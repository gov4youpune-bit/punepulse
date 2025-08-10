'use client';

import { useState } from 'react';
import { Shield, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function AdminAuth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      // send magic link (email OTP) — redirect back to /admin after sign-in
      const redirectTo = `${window.location.origin}/admin`;

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        console.error('Supabase signIn error', error);
        toast({ title: 'Failed to send link', description: error.message || 'Try again', variant: 'destructive' });
      } else {
        setEmailSent(true);
        toast({ title: 'Magic Link Sent', description: `Check ${email} for the link.` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Unable to send magic link', variant: 'destructive' });
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
            <p className="text-gray-600">Sign in with a magic link to access the admin dashboard</p>
          </div>

          {!emailSent ? (
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

              <Button type="submit" className="w-full" disabled={loading || !email.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Magic Link
                  </>
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Check your email</h3>
              <p className="text-gray-600 mb-4">We&apos;ve sent a magic link to <strong>{email}</strong></p>
              <Button variant="outline" onClick={() => setEmailSent(false)} className="w-full">
                Try different email
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">Only authorized personnel should sign in here.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
