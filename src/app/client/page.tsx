import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { mockHouses, mockScheduledVisits, mockHouseVisits, formatDate } from '@/data/mock';
import { IMPRESSION_EMOJIS } from '@/types';

export default function ClientDashboard() {
  const totalHouses = mockHouses.length;
  const visitedHouses = mockHouseVisits.length;
  const totalRecordings = mockHouseVisits.reduce((acc, v) => acc + v.recordings.length, 0);

  const scheduledVisits = mockScheduledVisits
    .filter(v => v.status === 'scheduled')
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  const lovedHouses = mockHouseVisits
    .filter(v => v.overallImpression === 'loved')
    .map(v => mockHouses.find(h => h.id === v.houseId))
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome Back!</h1>
        <p className="text-gray-600">Track your house hunting journey</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-500">Houses to Visit</p>
          <p className="text-3xl font-bold text-gray-900">{totalHouses}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Houses Visited</p>
          <p className="text-3xl font-bold text-green-600">{visitedHouses}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Recordings</p>
          <p className="text-3xl font-bold text-blue-600">{totalRecordings}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Favorites</p>
          <p className="text-3xl font-bold text-red-500">{lovedHouses.length}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Visits */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Visits</h2>
          </div>

          {scheduledVisits.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No upcoming visits</p>
          ) : (
            <div className="space-y-3">
              {scheduledVisits.map((visit) => {
                const house = mockHouses.find(h => h.id === visit.houseId);
                if (!house) return null;

                return (
                  <Link
                    key={visit.id}
                    href={`/client/house/${house.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{house.address}</p>
                      <p className="text-sm text-gray-500">{house.city}, {house.state}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatDate(visit.date)}</p>
                      <p className="text-sm text-gray-500">{visit.time}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>

        {/* Favorite Houses */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Favorites</h2>
            <Link href="/client/compare">
              <Button variant="ghost" size="sm">Compare</Button>
            </Link>
          </div>

          {lovedHouses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">No favorites yet</p>
              <p className="text-sm text-gray-400">Visit houses and mark your favorites</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lovedHouses.map((house) => {
                const visit = mockHouseVisits.find(v => v.houseId === house!.id);
                return (
                  <Link
                    key={house!.id}
                    href={`/client/house/${house!.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{IMPRESSION_EMOJIS.loved}</span>
                      <div>
                        <p className="font-medium text-gray-900">{house!.address}</p>
                        <p className="text-sm text-gray-500">
                          {visit?.recordings.length || 0} recordings
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        ${(house!.price / 1000).toFixed(0)}k
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <Link href="/client/houses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">View All Houses</p>
                <p className="text-sm text-gray-500">Browse your house list</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/client/compare">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Compare Houses</p>
                <p className="text-sm text-gray-500">Listen to your recordings side by side</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
