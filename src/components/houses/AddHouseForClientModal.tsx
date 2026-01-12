'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Select, FormField } from '@/components/ui/Form';

interface SearchResult {
  propertyId: string;
  listingId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  priceFormatted: string;
  bedrooms: number | null;
  bathrooms: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  propertyType: string | null;
  status: string;
  image: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface AddHouseForClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (propertyId: string, buyerId: string, propertyData: SearchResult) => void;
  clients: Client[];
}

export default function AddHouseForClientModal({
  isOpen,
  onClose,
  onAdd,
  clients,
}: AddHouseForClientModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<SearchResult | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setResults([]);
      setIsSearching(false);
      setSearchError('');
      setSelectedProperty(null);
      setSelectedClientId('');
      setHasSearched(false);
    }
  }, [isOpen]);

  // Helper to fetch with auto-refresh on 401
  const fetchWithRefresh = async (url: string): Promise<Response> => {
    let response = await fetch(url, { credentials: 'include' });

    // If unauthorized, try to refresh token and retry
    if (response.status === 401) {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResponse.ok) {
        // Retry the original request
        response = await fetch(url, { credentials: 'include' });
      }
    }

    return response;
  };

  // Debounced search
  const searchProperties = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      setSearchError('');
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setHasSearched(true);

    try {
      const response = await fetchWithRefresh(`/api/properties/search?query=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to search properties');
      }

      // Remove duplicates by propertyId
      const properties = data.data?.properties || [];
      const uniqueProperties = properties.filter(
        (property: SearchResult, index: number, self: SearchResult[]) =>
          index === self.findIndex((p) => p.propertyId === property.propertyId)
      );
      setResults(uniqueProperties);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search properties');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        searchProperties(searchQuery);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchProperties]);

  const handleAddProperty = () => {
    if (selectedProperty && selectedClientId) {
      onAdd(selectedProperty.propertyId, selectedClientId, selectedProperty);
      onClose();
    }
  };

  const formatSqft = (sqft: number | null) => {
    if (!sqft) return null;
    return new Intl.NumberFormat('en-US').format(sqft);
  };

  // Transform clients to select options format
  const clientOptions = useMemo(() => {
    return clients.map((client) => ({
      value: client.id,
      label: `${client.name} (${client.email})`,
    }));
  }, [clients]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add House for Client" size="lg">
      <div className="space-y-6">
        {/* Client Selection */}
        <FormField
          label="Select Client"
          required
          error={clients.length === 0 ? 'No clients available. Connect with clients first.' : undefined}
        >
          <Select
            options={clientOptions}
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            placeholder="Choose a client..."
            disabled={clients.length === 0}
            selectSize="md"
          />
        </FormField>

        {/* Search Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Search for a property</h4>
              <p className="mt-1 text-sm text-blue-700">
                Enter a city, ZIP code, or address to find properties for sale.
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div>
          <Input
            label="Search Location"
            placeholder="Enter city, ZIP code, or address..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedProperty(null);
            }}
          />
          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <p className="mt-1 text-sm text-gray-500">
              Type at least 3 characters to search
            </p>
          )}
        </div>

        {/* Loading State */}
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-[#006AFF]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-2 text-gray-600">Searching properties...</span>
          </div>
        )}

        {/* Error State */}
        {searchError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{searchError}</p>
            </div>
          </div>
        )}

        {/* No Results */}
        {!isSearching && hasSearched && results.length === 0 && !searchError && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search term or location.
            </p>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 font-medium">
              {results.length} {results.length === 1 ? 'property' : 'properties'} found
            </p>
            <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1">
              {results.map((property) => (
                <button
                  key={property.propertyId}
                  type="button"
                  onClick={() => setSelectedProperty(property)}
                  className={`
                    w-full flex gap-4 p-3 rounded-lg border-2 transition-all text-left
                    ${selectedProperty?.propertyId === property.propertyId
                      ? 'border-[#006AFF] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  {/* Property Image */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-200 rounded-lg overflow-hidden">
                    {property.image ? (
                      <img
                        src={property.image}
                        alt={property.address}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#006AFF]">
                      {property.priceFormatted}
                    </p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {property.address}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                      {property.bedrooms !== null && <span>{property.bedrooms} bd</span>}
                      {property.bathrooms !== null && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{property.bathrooms} ba</span>
                        </>
                      )}
                      {property.sqft !== null && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{formatSqft(property.sqft)} sqft</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div className="flex-shrink-0 self-center">
                    {selectedProperty?.propertyId === property.propertyId ? (
                      <div className="w-5 h-5 rounded-full bg-[#006AFF] flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddProperty}
            disabled={!selectedProperty || !selectedClientId}
          >
            Add to Client&apos;s List
          </Button>
        </div>
      </div>
    </Modal>
  );
}
