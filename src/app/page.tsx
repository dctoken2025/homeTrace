import Link from 'next/link';
import Card from '@/components/ui/Card';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Home Picker
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Record your impressions during house visits and find your perfect home
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/realtor" className="block">
          <Card className="h-full hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">I'm a Realtor</h2>
              <p className="text-gray-600 text-sm">
                Manage house listings, schedule visits, and plan routes for your clients
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/client" className="block">
          <Card className="h-full hover:shadow-lg hover:border-green-300 transition-all cursor-pointer group" padding="lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">I'm a Home Buyer</h2>
              <p className="text-gray-600 text-sm">
                Record your impressions during visits and compare houses to find your perfect match
              </p>
            </div>
          </Card>
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-500">
        A smarter way to house hunt
      </p>
    </div>
  );
}
