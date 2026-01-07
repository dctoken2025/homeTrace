'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { format } from 'date-fns';

interface Invite {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  token?: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export default function RealtorInvite() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    expiresInDays: 7,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastInvite, setLastInvite] = useState<Invite | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      const response = await fetch('/api/invites');
      if (response.ok) {
        const data = await response.json();
        setInvites(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err);
    } finally {
      setIsLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name || undefined,
          phone: formData.phone || undefined,
          expiresInDays: formData.expiresInDays,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to send invite');
      }

      setLastInvite(data.data.invite);
      setFormData({ name: '', email: '', phone: '', expiresInDays: 7 });
      fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/invites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchInvites();
      }
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (status: Invite['status']) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invite Client</h1>
        <p className="text-gray-600">Send an invitation to your client to join Home Picker</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            {lastInvite ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invitation Created!</h3>
                <p className="text-gray-600 mb-4">
                  Share this link with {lastInvite.name || lastInvite.email}:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <code className="text-sm text-gray-800 break-all">
                    {typeof window !== 'undefined' && `${window.location.origin}/accept-invite?token=${lastInvite.token}`}
                  </code>
                </div>
                <Button
                  onClick={() => lastInvite.token && copyInviteLink(lastInvite.token)}
                  variant="outline"
                  className="mb-4"
                >
                  {copiedToken === lastInvite.token ? 'Copied!' : 'Copy Link'}
                </Button>
                <div className="pt-4">
                  <Button onClick={() => setLastInvite(null)} variant="outline">
                    Send Another Invite
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Client Name"
                  placeholder="John Smith"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />

                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="(512) 555-0123"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In
                  </label>
                  <select
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                  >
                    <option value={1}>1 day</option>
                    <option value={3}>3 days</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                  </select>
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Invitation
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </Card>

          <Card className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-2">What happens next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span style={{ color: '#006AFF' }}>1.</span>
                Share the invite link with your client
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#006AFF' }}>2.</span>
                They sign up using the link to connect with you
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#006AFF' }}>3.</span>
                You can add houses and schedule visits for them
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#006AFF' }}>4.</span>
                They can record notes during visits and compare houses
              </li>
            </ul>
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Recent Invites</h3>
            {isLoadingInvites ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No invites sent yet
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {invite.name || invite.email}
                        </p>
                        {invite.name && (
                          <p className="text-sm text-gray-500">{invite.email}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Sent {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                          {invite.status === 'PENDING' && (
                            <> &middot; Expires {format(new Date(invite.expiresAt), 'MMM d')}</>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(invite.status)}
                        {invite.status === 'PENDING' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => invite.token && copyInviteLink(invite.token)}
                              className="text-xs hover:opacity-80"
                              style={{ color: '#006AFF' }}
                            >
                              {copiedToken === invite.token ? 'Copied!' : 'Copy Link'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
