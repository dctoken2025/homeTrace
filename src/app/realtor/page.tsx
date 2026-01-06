import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { mockHouses, mockScheduledVisits, mockClient, formatDate } from '@/data/mock';

export default function RealtorDashboard() {
  const totalHouses = mockHouses.length;
  const scheduledVisits = mockScheduledVisits.filter(v => v.status === 'scheduled');
  const completedVisits = mockScheduledVisits.filter(v => v.status === 'completed');

  const upcomingVisits = scheduledVisits
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your client.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-500">Total Houses</p>
          <p className="text-3xl font-bold text-gray-900">{totalHouses}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Scheduled Visits</p>
          <p className="text-3xl font-bold text-blue-600">{scheduledVisits.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Completed Visits</p>
          <p className="text-3xl font-bold text-green-600">{completedVisits.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Active Client</p>
          <p className="text-lg font-semibold text-gray-900">{mockClient.name}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/realtor/houses">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Add House</p>
                <p className="text-sm text-gray-500">Add a new house for your client</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/realtor/schedule">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">View Schedule</p>
                <p className="text-sm text-gray-500">See all scheduled visits</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/realtor/route">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Plan Route</p>
                <p className="text-sm text-gray-500">Optimize visit routes</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Upcoming Visits */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Visits</h2>
          <Link href="/realtor/schedule">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {upcomingVisits.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming visits scheduled</p>
        ) : (
          <div className="space-y-3">
            {upcomingVisits.map((visit) => {
              const house = mockHouses.find(h => h.id === visit.houseId);
              if (!house) return null;

              return (
                <div
                  key={visit.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{house.address}</p>
                    <p className="text-sm text-gray-500">{house.city}, {house.state}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatDate(visit.date)}</p>
                    <p className="text-sm text-gray-500">{visit.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
