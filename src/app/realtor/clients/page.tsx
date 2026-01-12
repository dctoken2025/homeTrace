'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageHeader, { UsersIcon, PlusIcon, LinkIcon } from '@/components/ui/PageHeader';
import { ConfirmModal } from '@/components/ui/Modal';
import InviteClientModal from '@/components/realtor/InviteClientModal';
import LinkClientModal from '@/components/realtor/LinkClientModal';
import ClientDetailModal from '@/components/realtor/ClientDetailModal';
import { format } from 'date-fns';

interface ClientStats {
  housesCount: number;
  visitsCount: number;
  completedVisits: number;
  lastVisit: {
    date: string;
    status: string;
  } | null;
}

interface Client {
  id: string;
  connectedAt: string;
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    createdAt: string;
    privacySettings: {
      shareReportWithRealtor: boolean;
      shareDreamHouseProfile: boolean;
      shareRecordings: boolean;
    } | null;
  };
  stats: ClientStats;
}

interface PendingInvite {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  token: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function RealtorClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [inviteInitialEmail, setInviteInitialEmail] = useState('');
  const [revokeInviteId, setRevokeInviteId] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const url = searchQuery
        ? `/api/clients?search=${encodeURIComponent(searchQuery)}`
        : '/api/clients';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setClients(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchPendingInvites = useCallback(async () => {
    try {
      const response = await fetch('/api/invites?status=PENDING');
      if (response.ok) {
        const data = await response.json();
        setPendingInvites(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchPendingInvites();
  }, [fetchClients, fetchPendingInvites]);

  const handleClientClick = (buyerId: string) => {
    setSelectedClientId(buyerId);
    setIsDetailModalOpen(true);
  };

  const handleInviteInstead = (email: string) => {
    setInviteInitialEmail(email);
    setIsInviteModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchClients();
    fetchPendingInvites();
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchPendingInvites();
      }
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Clients"
        subtitle="View and manage your connected clients"
        icon={<UsersIcon />}
        stats={clients.length > 0 ? [
          { label: 'Total', value: clients.length },
        ] : undefined}
        secondaryAction={{
          label: 'Link Existing',
          icon: <LinkIcon />,
          onClick: () => setIsLinkModalOpen(true),
        }}
        action={{
          label: 'Invite Client',
          icon: <PlusIcon />,
          onClick: () => setIsInviteModalOpen(true),
        }}
      />

      {/* Search */}
      <div>
        <Input
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Pending Invitations ({pendingInvites.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="border-dashed border-2 border-gray-200 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100"
                  >
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {invite.name || 'No name provided'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{invite.email}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    Pending
                  </span>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  <p>Sent {format(new Date(invite.createdAt), 'MMM d, yyyy')}</p>
                  <p>Expires {format(new Date(invite.expiresAt), 'MMM d, yyyy')}</p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => copyInviteLink(invite.token)}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRevokeInvite(invite.id)}
                  >
                    Revoke
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Connected Clients Section */}
      {(clients.length > 0 || pendingInvites.length > 0) && !isLoading && (
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Connected Clients ({clients.length})
        </h2>
      )}

      {/* Clients Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#E3F2FD' }}>
            <svg className="w-8 h-8" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No clients found' : 'No clients yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Invite your first client to get started'}
          </p>
          {!searchQuery && (
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setIsLinkModalOpen(true)}>
                Link Existing Client
              </Button>
              <Button onClick={() => setIsInviteModalOpen(true)}>
                Invite New Client
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleClientClick(client.buyer.id)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: '#E3F2FD' }}
                >
                  <span className="text-lg font-medium" style={{ color: '#006AFF' }}>
                    {client.buyer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{client.buyer.name}</p>
                  <p className="text-sm text-gray-500 truncate">{client.buyer.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>{client.stats.housesCount} houses</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{client.stats.completedVisits}/{client.stats.visitsCount} visits</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Connected {format(new Date(client.connectedAt), 'MMM d, yyyy')}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <InviteClientModal
        isOpen={isInviteModalOpen}
        onClose={() => {
          setIsInviteModalOpen(false);
          setInviteInitialEmail('');
        }}
        onSuccess={handleModalSuccess}
        initialEmail={inviteInitialEmail}
      />

      <LinkClientModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={handleModalSuccess}
        onInviteInstead={handleInviteInstead}
      />

      <ClientDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedClientId(null);
        }}
        clientId={selectedClientId}
      />
    </div>
  );
}
