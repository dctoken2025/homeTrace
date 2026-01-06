'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { mockHouses, mockScheduledVisits, formatDate } from '@/data/mock';

export default function RealtorRoute() {
  const scheduledVisits = mockScheduledVisits
    .filter(v => v.status === 'scheduled')
    .sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

  const [selectedDate, setSelectedDate] = useState<string | null>(
    scheduledVisits.length > 0 ? scheduledVisits[0].date.toISOString().split('T')[0] : null
  );

  const uniqueDates = [...new Set(scheduledVisits.map(v => v.date.toISOString().split('T')[0]))];

  const visitsForDate = scheduledVisits.filter(
    v => v.date.toISOString().split('T')[0] === selectedDate
  );

  const housesForRoute = visitsForDate
    .map(v => mockHouses.find(h => h.id === v.houseId))
    .filter(Boolean);

  const generateGoogleMapsUrl = () => {
    if (housesForRoute.length === 0) return '';

    const addresses = housesForRoute.map(h =>
      encodeURIComponent(`${h!.address}, ${h!.city}, ${h!.state} ${h!.zipCode}`)
    );

    if (addresses.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`;
    }

    const origin = addresses[0];
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(1, -1).join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ''}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plan Route</h1>
        <p className="text-gray-600">Optimize your visit route for the day</p>
      </div>

      {/* Date Selection */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {uniqueDates.map((date) => (
          <button
            key={date}
            onClick={() => setSelectedDate(date)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedDate === date
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {formatDate(new Date(date))}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Map Preview */}
        <Card padding="none" className="overflow-hidden">
          <div className="bg-gray-200 h-64 md:h-full min-h-[300px] flex items-center justify-center relative">
            {/* Mock Map Image */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-100">
              <svg className="w-full h-full opacity-20" viewBox="0 0 100 100">
                <path d="M10,50 Q30,20 50,50 T90,50" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <path d="M20,30 Q40,60 60,30 T100,30" fill="none" stroke="currentColor" strokeWidth="0.5" />
                <path d="M0,70 Q20,40 40,70 T80,70" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </svg>
            </div>
            <div className="relative z-10 text-center p-4">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <p className="text-gray-500 text-sm">Map preview</p>
              <p className="text-gray-400 text-xs">{housesForRoute.length} stops</p>
            </div>
          </div>
        </Card>

        {/* Route List */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Route Order</h2>

          {housesForRoute.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No visits scheduled for this date</p>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {housesForRoute.map((house, index) => {
                  const visit = visitsForDate[index];
                  return (
                    <div
                      key={house!.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{house!.address}</p>
                        <p className="text-sm text-gray-500">{house!.city}, {house!.state}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{visit.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                className="w-full"
                onClick={() => window.open(generateGoogleMapsUrl(), '_blank')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in Google Maps
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
