'use client';

import { useState } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AudioTimeline from '@/components/audio/AudioTimeline';
import { mockHouses, mockHouseVisits, formatPrice } from '@/data/mock';
import { House, HouseVisit, DEFAULT_ROOMS, IMPRESSION_EMOJIS } from '@/types';

export default function ComparePage() {
  const [selectedHouses, setSelectedHouses] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');

  const visitedHouses = mockHouses.filter(house =>
    mockHouseVisits.some(v => v.houseId === house.id)
  );

  const toggleHouseSelection = (houseId: string) => {
    setSelectedHouses(prev => {
      if (prev.includes(houseId)) {
        return prev.filter(id => id !== houseId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, houseId];
    });
  };

  const getVisitForHouse = (houseId: string): HouseVisit | undefined => {
    return mockHouseVisits.find(v => v.houseId === houseId);
  };

  const selectedHousesData = selectedHouses
    .map(id => ({
      house: mockHouses.find(h => h.id === id)!,
      visit: getVisitForHouse(id)!,
    }))
    .filter(d => d.house && d.visit);

  const allRoomsWithRecordings = [
    ...new Set(
      selectedHousesData.flatMap(d => d.visit.recordings.map(r => r.roomId))
    ),
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compare Houses</h1>
        <p className="text-gray-600">Listen to your recordings side by side</p>
      </div>

      {/* House Selector */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          Select houses to compare (up to 3)
        </h2>

        {visitedHouses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No visited houses yet. Visit some houses first!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visitedHouses.map(house => {
              const visit = getVisitForHouse(house.id);
              const isSelected = selectedHouses.includes(house.id);

              return (
                <button
                  key={house.id}
                  onClick={() => toggleHouseSelection(house.id)}
                  disabled={!isSelected && selectedHouses.length >= 3}
                  className={`relative p-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50 ring-2 ring-blue-500'
                      : selectedHouses.length >= 3
                      ? 'bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="relative w-full h-20 rounded overflow-hidden mb-2">
                    <Image
                      src={house.images[0]}
                      alt={house.address}
                      fill
                      className="object-cover"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-900 truncate">{house.address}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{formatPrice(house.price)}</span>
                    {visit?.overallImpression && (
                      <span>{IMPRESSION_EMOJIS[visit.overallImpression]}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Comparison View */}
      {selectedHousesData.length > 0 && (
        <>
          {/* Room Filter */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedRoom('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedRoom === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Rooms
            </button>
            {allRoomsWithRecordings.map(roomId => {
              const room = DEFAULT_ROOMS.find(r => r.id === roomId);
              return (
                <button
                  key={roomId}
                  onClick={() => setSelectedRoom(roomId)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedRoom === roomId
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{room?.icon}</span>
                  <span>{room?.name || roomId}</span>
                </button>
              );
            })}
          </div>

          {/* Comparison Grid */}
          <div className={`grid gap-4 ${
            selectedHousesData.length === 1
              ? 'grid-cols-1'
              : selectedHousesData.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 md:grid-cols-3'
          }`}>
            {selectedHousesData.map(({ house, visit }) => {
              const filteredRecordings = selectedRoom === 'all'
                ? visit.recordings
                : visit.recordings.filter(r => r.roomId === selectedRoom);

              return (
                <Card key={house.id} className="overflow-hidden">
                  {/* House Header */}
                  <div className="relative h-32 -mx-4 -mt-4 mb-4">
                    <Image
                      src={house.images[0]}
                      alt={house.address}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 right-3">
                      <p className="text-white font-semibold truncate">{house.address}</p>
                      <p className="text-white/80 text-sm">{formatPrice(house.price)}</p>
                    </div>
                    {visit.overallImpression && (
                      <span className="absolute top-2 right-2 text-2xl">
                        {IMPRESSION_EMOJIS[visit.overallImpression]}
                      </span>
                    )}
                  </div>

                  {/* House Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Beds</p>
                      <p className="font-semibold text-gray-900">{house.bedrooms}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Baths</p>
                      <p className="font-semibold text-gray-900">{house.bathrooms}</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-xs text-gray-500">Sqft</p>
                      <p className="font-semibold text-gray-900">{(house.sqft / 1000).toFixed(1)}k</p>
                    </div>
                  </div>

                  {/* Recordings */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">
                      {selectedRoom === 'all' ? 'All Recordings' : DEFAULT_ROOMS.find(r => r.id === selectedRoom)?.name}
                      {' '}({filteredRecordings.length})
                    </h3>
                    {filteredRecordings.length > 0 ? (
                      <AudioTimeline
                        recordings={filteredRecordings}
                        groupByRoom={selectedRoom === 'all'}
                      />
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No recordings for this room
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {selectedHousesData.length === 0 && visitedHouses.length > 0 && (
        <Card className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select houses to compare</h3>
          <p className="text-gray-500">Choose up to 3 houses from the list above</p>
        </Card>
      )}
    </div>
  );
}
