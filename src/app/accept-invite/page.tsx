'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

interface InviteDetails {
  email: string;
  name: string | null;
  expiresAt: string;
  realtor: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

interface CurrentUser {
  role: string;
  email: string;
}

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isWrongRole, setIsWrongRole] = useState(false);

  // Check if user is logged in and their role
  useEffect(() => {
    const checkCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.data?.user) {
            setCurrentUser({
              role: data.data.user.role,
              email: data.data.user.email,
            });
            // If logged in as non-buyer, flag it
            if (data.data.user.role !== 'BUYER') {
              setIsWrongRole(true);
            }
          }
        }
      } catch {
        // Not logged in, that's fine
      }
    };
    checkCurrentUser();
  }, []);

  useEffect(() => {
    if (!token) {
      setError('No invite token provided');
      setIsLoading(false);
      return;
    }

    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/invites/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Invalid or expired invite');
        }

        setInvite(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invite');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.status === 401) {
        // User needs to sign up or log in
        setNeedsAuth(true);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to accept invite');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006AFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connected!</h2>
          <p className="text-gray-600 mb-6">
            You are now connected with {invite?.realtor.name}. They can now share houses and schedule visits for you.
          </p>
          <Link href="/client">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (needsAuth || isWrongRole) {
    const handleLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        setCurrentUser(null);
        setIsWrongRole(false);
        setNeedsAuth(true);
      } catch {
        // Ignore error
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E3F2FD' }}>
            <svg className="w-8 h-8" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          {isWrongRole ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Wrong Account Type</h2>
              <p className="text-gray-600 mb-4">
                You&apos;re currently logged in as a <span className="font-semibold">{currentUser?.role === 'REALTOR' ? 'Realtor' : currentUser?.role}</span> ({currentUser?.email}).
              </p>
              <p className="text-gray-600 mb-4">
                To accept this invite from {invite?.realtor.name}, you need to sign in with a <span className="font-semibold">Buyer</span> account.
              </p>

              <div className="space-y-4">
                <Button onClick={handleLogout} className="w-full">
                  Sign Out & Continue
                </Button>
                <Link href={currentUser?.role === 'REALTOR' ? '/realtor' : '/'}>
                  <Button variant="outline" className="w-full">Go to My Dashboard</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Sign Up to Accept</h2>
              <p className="text-gray-600 mb-4">
                Create an account or sign in to connect with {invite?.realtor.name}.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-gray-900 mb-2">With HomeTrace you can:</p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Browse homes your realtor shares with you
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Schedule and manage property visits
                  </li>
                  <li className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Rate and compare properties easily
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <Link href={`/sign-up?invite=${token}`}>
                  <Button className="w-full">Create Account</Button>
                </Link>
                <Link href={`/sign-in?redirect=/accept-invite?token=${token}`}>
                  <Button variant="outline" className="w-full">Sign In</Button>
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-6">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#E3F2FD' }}>
            <svg className="w-8 h-8" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">You've Been Invited!</h2>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Invited by</p>
          <p className="font-semibold text-gray-900">{invite?.realtor.name}</p>
          <p className="text-sm text-gray-600">{invite?.realtor.email}</p>
          {invite?.realtor.phone && (
            <p className="text-sm text-gray-600">{invite?.realtor.phone}</p>
          )}
        </div>

        <div className="text-center text-gray-600 mb-6">
          <p>
            {invite?.realtor.name} wants to connect with you on Home Picker to help you find your perfect home.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <Button
          onClick={handleAccept}
          className="w-full"
          disabled={isAccepting}
        >
          {isAccepting ? 'Accepting...' : 'Accept Invitation'}
        </Button>

        <p className="text-xs text-gray-400 text-center mt-4">
          By accepting, you'll be connected with this realtor and they can share properties with you.
        </p>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006AFF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
