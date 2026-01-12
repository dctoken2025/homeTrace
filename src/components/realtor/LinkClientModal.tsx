'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LinkClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onInviteInstead?: (email: string) => void;
}

interface LinkedClient {
  id: string;
  name: string;
  email: string;
}

export default function LinkClientModal({
  isOpen,
  onClose,
  onSuccess,
  onInviteInstead,
}: LinkClientModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedClient, setLinkedClient] = useState<LinkedClient | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await fetch('/api/clients/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
          return;
        }
        throw new Error(data.error?.message || 'Failed to link client');
      }

      setLinkedClient({
        id: data.data.buyer.id,
        name: data.data.buyer.name,
        email: data.data.buyer.email,
      });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setLinkedClient(null);
    setNotFound(false);
    onClose();
  };

  const handleInviteInstead = () => {
    const currentEmail = email;
    handleClose();
    onInviteInstead?.(currentEmail);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={linkedClient ? 'Client Linked!' : 'Link Existing Client'}
      description={linkedClient ? undefined : 'Connect with a client who already has a HomeTrace account'}
      size="md"
    >
      {linkedClient ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {linkedClient.name}
          </h3>
          <p className="text-gray-600 mb-4">{linkedClient.email}</p>
          <p className="text-sm text-gray-500 mb-6">
            You can now add houses and schedule visits for this client.
          </p>
          <Button onClick={handleClose}>Done</Button>
        </div>
      ) : notFound ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Client Not Found
          </h3>
          <p className="text-gray-600 mb-6">
            No account found with <strong>{email}</strong>.<br />
            Would you like to send them an invitation?
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => setNotFound(false)}>
              Try Again
            </Button>
            <Button onClick={handleInviteInstead}>
              Send Invite
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
            label="Client's Email Address"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <p className="text-sm text-gray-500">
            Enter the email address of a client who already has a HomeTrace account.
            They will be automatically linked to your profile.
          </p>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting || !email}>
              {isSubmitting ? (
                'Searching...'
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Link Client
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
