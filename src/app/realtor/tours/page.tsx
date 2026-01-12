'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PageHeader, { RouteIcon, PlusIcon } from '@/components/ui/PageHeader';
import { format } from 'date-fns';

interface House {
  id: string;
  address: string;
  city: string;
  state: string;
  price: number;
}

interface TourStop {
  id: string;
  orderIndex: number;
  estimatedTime: string | null;
  notes: string | null;
  house: House;
  visit: {
    id: string;
    status: string;
  } | null;
}

interface Tour {
  id: string;
  name: string;
  buyerId: string | null;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string | null;
  notes: string | null;
  stopsCount: number;
  stops: TourStop[];
  createdAt: string;
}

interface Connection {
  id: string;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
}

export default function RealtorTours() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    buyerId: '',
    scheduledDate: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [selectedHouseId, setSelectedHouseId] = useState('');

  const fetchTours = useCallback(async () => {
    try {
      const response = await fetch('/api/tours');
      if (response.ok) {
        const data = await response.json();
        setTours(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tours:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch('/api/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  }, []);

  const fetchHouses = useCallback(async () => {
    try {
      const response = await fetch('/api/houses');
      if (response.ok) {
        const data = await response.json();
        setHouses(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch houses:', err);
    }
  }, []);

  useEffect(() => {
    fetchTours();
    fetchConnections();
    fetchHouses();
  }, [fetchTours, fetchConnections, fetchHouses]);

  const handleCreateTour = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Convert datetime-local format to ISO 8601 with timezone
      let scheduledDateISO: string | undefined;
      if (formData.scheduledDate) {
        const date = new Date(formData.scheduledDate);
        scheduledDateISO = date.toISOString();
      }

      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          buyerId: formData.buyerId || undefined,
          scheduledDate: scheduledDateISO,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create tour');
      }

      setFormData({ name: '', buyerId: '', scheduledDate: '', notes: '' });
      setShowCreateModal(false);
      fetchTours();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tour');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tourId: string, status: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        fetchTours();
        if (selectedTour?.id === tourId) {
          const data = await response.json();
          setSelectedTour({ ...selectedTour, status: data.data.tour.status });
        }
      }
    } catch (err) {
      console.error('Failed to update tour status:', err);
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!confirm('Are you sure you want to delete this tour?')) return;

    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTours();
        if (selectedTour?.id === tourId) {
          setSelectedTour(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete tour:', err);
    }
  };

  const handleAddStop = async (tourId: string) => {
    if (!selectedHouseId) return;

    try {
      const response = await fetch(`/api/tours/${tourId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ houseId: selectedHouseId }),
      });

      if (response.ok) {
        setSelectedHouseId('');
        setShowAddStopModal(false);
        fetchTours();
        // Refresh selected tour
        if (selectedTour?.id === tourId) {
          const tourResponse = await fetch(`/api/tours/${tourId}`);
          if (tourResponse.ok) {
            const data = await tourResponse.json();
            setSelectedTour({
              ...data.data,
              stopsCount: data.data.stops.length,
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to add stop:', err);
    }
  };

  const handleRemoveStop = async (tourId: string, stopId: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}/stops?stopId=${stopId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTours();
        // Refresh selected tour
        if (selectedTour?.id === tourId) {
          const tourResponse = await fetch(`/api/tours/${tourId}`);
          if (tourResponse.ok) {
            const data = await tourResponse.json();
            setSelectedTour({
              ...data.data,
              stopsCount: data.data.stops.length,
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to remove stop:', err);
    }
  };

  const getStatusBadge = (status: Tour['status']) => {
    const styles = {
      PLANNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getBuyerName = (buyerId: string | null) => {
    if (!buyerId) return null;
    const connection = connections.find((c) => c.buyer.id === buyerId);
    return connection?.buyer.name || 'Unknown';
  };

  const availableHouses = selectedTour
    ? houses.filter((h) => !selectedTour.stops.some((s) => s.house.id === h.id))
    : houses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tours"
        subtitle="Plan and manage property tours for your clients"
        icon={<RouteIcon />}
        stats={tours.length > 0 ? [
          { label: 'Total Tours', value: tours.length },
          { label: 'Planned', value: tours.filter(t => t.status === 'PLANNED').length },
          { label: 'Completed', value: tours.filter(t => t.status === 'COMPLETED').length },
        ] : undefined}
        action={{
          label: 'New Tour',
          icon: <PlusIcon />,
          onClick: () => setShowCreateModal(true),
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tours List */}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">All Tours</h3>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : tours.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tours yet. Create your first tour!
              </div>
            ) : (
              <div className="space-y-3">
                {tours.map((tour) => (
                  <div
                    key={tour.id}
                    onClick={() => setSelectedTour(tour)}
                    className="p-3 border rounded-lg cursor-pointer transition-colors"
                    style={selectedTour?.id === tour.id ? { borderColor: '#006AFF', background: '#E3F2FD' } : { borderColor: '#E5E7EB' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-gray-900">{tour.name}</p>
                      {getStatusBadge(tour.status)}
                    </div>
                    {tour.buyerId && (
                      <p className="text-sm text-gray-600">
                        Client: {getBuyerName(tour.buyerId)}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      {tour.stopsCount} stop{tour.stopsCount !== 1 ? 's' : ''}
                      {tour.scheduledDate && (
                        <> &middot; {format(new Date(tour.scheduledDate), 'MMM d, yyyy')}</>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Tour Details */}
        <div className="lg:col-span-2">
          {selectedTour ? (
            <Card>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{selectedTour.name}</h3>
                  {selectedTour.buyerId && (
                    <p className="text-gray-600">
                      For: {getBuyerName(selectedTour.buyerId)}
                    </p>
                  )}
                  {selectedTour.scheduledDate && (
                    <p className="text-sm text-gray-500">
                      Scheduled: {format(new Date(selectedTour.scheduledDate), 'MMMM d, yyyy')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedTour.status)}
                </div>
              </div>

              {selectedTour.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{selectedTour.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedTour.status === 'PLANNED' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedTour.id, 'IN_PROGRESS')}
                    >
                      Start Tour
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddStopModal(true)}
                    >
                      Add Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedTour.id, 'CANCELLED')}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                {selectedTour.status === 'IN_PROGRESS' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedTour.id, 'COMPLETED')}
                    >
                      Complete Tour
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedTour.id, 'CANCELLED')}
                    >
                      Cancel
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => handleDeleteTour(selectedTour.id)}
                >
                  Delete
                </Button>
              </div>

              {/* Stops */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Tour Stops ({selectedTour.stops.length})
                </h4>
                {selectedTour.stops.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No stops added yet. Click "Add Stop" to add properties.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedTour.stops.map((stop, index) => (
                      <div
                        key={stop.id}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center font-medium" style={{ background: '#006AFF' }}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{stop.house.address}</p>
                          <p className="text-sm text-gray-600">
                            {stop.house.city}, {stop.house.state}
                          </p>
                          <p className="text-sm text-gray-500">
                            ${stop.house.price.toLocaleString()}
                            {stop.estimatedTime && (
                              <> &middot; Est. {format(new Date(stop.estimatedTime), 'h:mm a')}</>
                            )}
                          </p>
                          {stop.notes && (
                            <p className="text-sm text-gray-500 mt-1">{stop.notes}</p>
                          )}
                        </div>
                        {(selectedTour.status === 'PLANNED' || selectedTour.status === 'IN_PROGRESS') && (
                          <button
                            onClick={() => handleRemoveStop(selectedTour.id, stop.id)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                Select a tour to view details
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Create Tour Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Tour</h3>
            <form onSubmit={handleCreateTour} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Input
                label="Tour Name"
                placeholder="Saturday House Tour"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client (Optional)
                </label>
                <select
                  value={formData.buyerId}
                  onChange={(e) => setFormData({ ...formData, buyerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No specific client</option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.buyer.id}>
                      {conn.buyer.name} ({conn.buyer.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Tour'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddStopModal && selectedTour && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Stop to Tour</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Property
                </label>
                {availableHouses.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No available properties to add.
                  </p>
                ) : (
                  <select
                    value={selectedHouseId}
                    onChange={(e) => setSelectedHouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a property</option>
                    {availableHouses.map((house) => (
                      <option key={house.id} value={house.id}>
                        {house.address}, {house.city} - ${house.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleAddStop(selectedTour.id)}
                  className="flex-1"
                  disabled={!selectedHouseId}
                >
                  Add Stop
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddStopModal(false);
                    setSelectedHouseId('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
