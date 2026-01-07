'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { format } from 'date-fns';
import Link from 'next/link';

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

interface ClientDetail {
  connection: {
    id: string;
    connectedAt: string;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  houses: Array<{
    id: string;
    isFavorite: boolean;
    matchScore: number | null;
    notes: string | null;
    realtorNotes: string | null;
    house: {
      id: string;
      address: string;
      city: string;
      state: string;
      price: number | null;
    };
  }>;
  visits: Array<{
    id: string;
    status: string;
    scheduledAt: string;
    completedAt: string | null;
    overallImpression: string | null;
    wouldBuy: boolean | null;
    house: {
      id: string;
      address: string;
      city: string;
    };
  }>;
  dreamHouseProfile: any | null;
  reports: Array<{
    id: string;
    status: string;
    housesAnalyzed: number;
    createdAt: string;
  }>;
}

export default function RealtorClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<ClientDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const fetchClientDetail = async (buyerId: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await fetch(`/api/clients/${buyerId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedClient(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch client detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getImpressionIcon = (impression: string | null) => {
    if (!impression) return null;
    const icons: Record<string, string> = {
      LOVED: '❤️',
      LIKED: '👍',
      NEUTRAL: '😐',
      DISLIKED: '👎',
    };
    return icons[impression] || null;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">View and manage your connected clients</p>
        </div>
        <Link href="/realtor/invite">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Invite Client
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clients List */}
        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4">
              <Input
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No clients found' : 'No clients yet. Invite your first client!'}
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => fetchClientDetail(client.buyer.id)}
                    className="p-3 border rounded-lg cursor-pointer transition-colors"
                    style={
                      selectedClient?.buyer.id === client.buyer.id
                        ? { borderColor: '#006AFF', background: '#E3F2FD' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                        <span className="font-medium" style={{ color: '#006AFF' }}>
                          {client.buyer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{client.buyer.name}</p>
                        <p className="text-sm text-gray-500 truncate">{client.buyer.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{client.stats.housesCount} houses</span>
                      <span>{client.stats.completedVisits}/{client.stats.visitsCount} visits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Client Detail */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <div className="space-y-6">
              {/* Client Info */}
              <Card>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                      <span className="text-2xl font-medium" style={{ color: '#006AFF' }}>
                        {selectedClient.buyer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedClient.buyer.name}
                      </h2>
                      <p className="text-gray-600">{selectedClient.buyer.email}</p>
                      {selectedClient.buyer.phone && (
                        <p className="text-sm text-gray-500">{selectedClient.buyer.phone}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Connected {format(new Date(selectedClient.connection.connectedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy sharing status */}
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Shared with you:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedClient.dreamHouseProfile && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Dream House Profile
                      </span>
                    )}
                    {selectedClient.reports.length > 0 && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        AI Reports
                      </span>
                    )}
                    {!selectedClient.dreamHouseProfile && selectedClient.reports.length === 0 && (
                      <span className="text-xs text-gray-500">
                        No shared data yet
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Houses */}
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Houses ({selectedClient.houses.length})
                </h3>
                {selectedClient.houses.length === 0 ? (
                  <p className="text-gray-500 text-sm">No houses assigned yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedClient.houses.map((hb) => (
                      <div
                        key={hb.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{hb.house.address}</p>
                          <p className="text-sm text-gray-600">
                            {hb.house.city}, {hb.house.state}
                            {hb.house.price && (
                              <> &middot; ${hb.house.price.toLocaleString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hb.isFavorite && (
                            <span className="text-red-500" title="Favorite">❤️</span>
                          )}
                          {hb.matchScore && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#E3F2FD', color: '#006AFF' }}>
                              {Math.round(hb.matchScore)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Visits */}
              <Card>
                <h3 className="font-semibold text-gray-900 mb-4">
                  Recent Visits ({selectedClient.visits.length})
                </h3>
                {selectedClient.visits.length === 0 ? (
                  <p className="text-gray-500 text-sm">No visits scheduled yet</p>
                ) : (
                  <div className="space-y-3">
                    {selectedClient.visits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{visit.house.address}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(visit.scheduledAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getImpressionIcon(visit.overallImpression)}
                          {visit.wouldBuy && (
                            <span className="text-green-500" title="Would buy">✓</span>
                          )}
                          {getStatusBadge(visit.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Dream House Profile Preview */}
              {selectedClient.dreamHouseProfile && (
                <Card>
                  <h3 className="font-semibold text-gray-900 mb-4">Dream House Profile</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {JSON.stringify(selectedClient.dreamHouseProfile, null, 2)}
                    </pre>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                {isLoadingDetail ? 'Loading...' : 'Select a client to view details'}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
