'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { format } from 'date-fns';

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
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

export default function ClientDetailModal({
  isOpen,
  onClose,
  clientId,
}: ClientDetailModalProps) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientDetail(clientId);
    }
  }, [isOpen, clientId]);

  const fetchClientDetail = async (buyerId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/clients/${buyerId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch client detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setClient(null);
    onClose();
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={client?.buyer.name || 'Client Details'}
      size="xl"
    >
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : client ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Client Info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E3F2FD' }}>
              <span className="text-2xl font-medium" style={{ color: '#006AFF' }}>
                {client.buyer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {client.buyer.name}
              </h2>
              <p className="text-gray-600">{client.buyer.email}</p>
              {client.buyer.phone && (
                <p className="text-sm text-gray-500">{client.buyer.phone}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Connected {format(new Date(client.connection.connectedAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Shared Data */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Shared with you:</p>
            <div className="flex flex-wrap gap-2">
              {client.dreamHouseProfile && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  Dream House Profile
                </span>
              )}
              {client.reports.length > 0 && (
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                  AI Reports
                </span>
              )}
              {!client.dreamHouseProfile && client.reports.length === 0 && (
                <span className="text-xs text-gray-500">
                  No shared data yet
                </span>
              )}
            </div>
          </div>

          {/* Houses */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Houses ({client.houses.length})
            </h3>
            {client.houses.length === 0 ? (
              <p className="text-gray-500 text-sm">No houses assigned yet</p>
            ) : (
              <div className="space-y-2">
                {client.houses.map((hb) => (
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
          </div>

          {/* Recent Visits */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">
              Recent Visits ({client.visits.length})
            </h3>
            {client.visits.length === 0 ? (
              <p className="text-gray-500 text-sm">No visits scheduled yet</p>
            ) : (
              <div className="space-y-2">
                {client.visits.map((visit) => (
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
          </div>

          {/* Dream House Profile */}
          {client.dreamHouseProfile && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Dream House Profile</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(client.dreamHouseProfile, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Failed to load client details
        </div>
      )}
    </Modal>
  );
}
