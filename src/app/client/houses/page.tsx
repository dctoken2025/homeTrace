'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import HouseCard from '@/components/houses/HouseCard';
import AddHouseModal from '@/components/houses/AddHouseModal';
import { mockHouses, mockHouseVisits } from '@/data/mock';

type Filter = 'all' | 'visited' | 'not-visited' | 'favorites';

export default function ClientHouses() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const getVisitForHouse = (houseId: string) => {
    return mockHouseVisits.find(v => v.houseId === houseId);
  };

  const filteredHouses = mockHouses.filter(house => {
    const visit = getVisitForHouse(house.id);

    switch (filter) {
      case 'visited':
        return !!visit;
      case 'not-visited':
        return !visit;
      case 'favorites':
        return visit?.overallImpression === 'loved';
      default:
        return true;
    }
  });

  const handleAddHouse = (url: string) => {
    console.log('Adding house from URL:', url);
    alert(`House added from: ${url}\n\n(This is a mock - in production, we would fetch the property data)`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Houses</h1>
          <p className="text-gray-600">Houses you're considering</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add House
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'visited', label: 'Visited' },
          { value: 'not-visited', label: 'Not Visited' },
          { value: 'favorites', label: 'Favorites' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as Filter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === option.value
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* House Grid */}
      {filteredHouses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No houses found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHouses.map((house) => (
            <HouseCard
              key={house.id}
              house={house}
              visit={getVisitForHouse(house.id)}
              linkPrefix="/client/house"
            />
          ))}
        </div>
      )}

      <AddHouseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddHouse}
      />
    </div>
  );
}
