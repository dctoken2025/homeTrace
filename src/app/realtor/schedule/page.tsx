import Card from '@/components/ui/Card';
import { mockHouses, mockScheduledVisits, formatDate } from '@/data/mock';

export default function RealtorSchedule() {
  const groupedVisits = mockScheduledVisits.reduce((acc, visit) => {
    const dateKey = visit.date.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(visit);
    return acc;
  }, {} as Record<string, typeof mockScheduledVisits>);

  const sortedDates = Object.keys(groupedVisits).sort();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visit Schedule</h1>
        <p className="text-gray-600">Manage your scheduled house visits</p>
      </div>

      <div className="space-y-6">
        {sortedDates.map((dateKey) => {
          const visits = groupedVisits[dateKey];
          const date = new Date(dateKey);

          return (
            <Card key={dateKey}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {formatDate(date)}
              </h2>
              <div className="space-y-3">
                {visits
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((visit) => {
                    const house = mockHouses.find(h => h.id === visit.houseId);
                    if (!house) return null;

                    return (
                      <div
                        key={visit.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          visit.status === 'completed'
                            ? 'bg-green-50 border-green-200'
                            : visit.status === 'cancelled'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-16 text-center py-1 rounded font-medium text-sm ${
                              visit.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : visit.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {visit.time}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{house.address}</p>
                            <p className="text-sm text-gray-500">
                              {house.city}, {house.state} - {house.bedrooms} bed, {house.bathrooms} bath
                            </p>
                          </div>
                        </div>
                        <div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              visit.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : visit.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
