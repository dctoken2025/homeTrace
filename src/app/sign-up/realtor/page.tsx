'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RealtorSignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate registration
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Redirect to realtor dashboard
    router.push('/realtor');
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB, #E3F2FD)' }}>
      {/* Left Side - Value Proposition */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
        <div>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">HomeTrace</span>
          </Link>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-6">
            <span className="text-2xl">💼</span>
            <span className="text-white font-medium">For Real Estate Professionals</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Close deals faster with clarity
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Help your clients find their dream home by organizing visits, planning routes, and accessing their real-time insights.
          </p>

          <ul className="space-y-4">
            {[
              { icon: '👥', text: 'Manage multiple clients and their house searches' },
              { icon: '📅', text: 'Schedule visits and share calendars instantly' },
              { icon: '🗺️', text: 'Plan efficient routes for showing days' },
              { icon: '💡', text: 'Access client recordings and AI insights' },
            ].map((item, index) => (
              <li key={index} className="flex items-center gap-3 text-white">
                <span className="text-2xl">{item.icon}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">
                &quot;HomeTrace transformed how I work with buyers. They come to decisions faster because they can relisten to their own impressions. My close rate is up 30%.&quot;
              </p>
              <p className="text-blue-200 text-sm">— Marcus R., Licensed Realtor, Austin TX</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-gray-900">HomeTrace</span>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="lg:hidden inline-flex items-center gap-2 rounded-full px-4 py-2 mb-4" style={{ background: '#E3F2FD' }}>
                <span className="text-xl">💼</span>
                <span className="font-medium text-sm" style={{ color: '#006AFF' }}>Realtor Account</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-2">
                Start your 14-day free trial
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                    placeholder="Marcus Rodriguez"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                    placeholder="(512) 555-0123"
                  />
                </div>

                <div>
                  <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-1">
                    License #
                  </label>
                  <input
                    id="license"
                    type="text"
                    required
                    value={formData.license}
                    onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                    placeholder="TX-123456"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Work email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                  placeholder="marcus@realty.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': '#006AFF' } as React.CSSProperties}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: isLoading ? '#6B6B76' : 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Start free trial'
                )}
              </button>

              <p className="text-center text-xs text-gray-500">
                No credit card required for trial
              </p>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                  <svg className="w-5 h-5" style={{ color: '#006AFF' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-center mt-6 space-y-2">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link href="/sign-in" className="font-semibold hover:underline" style={{ color: '#006AFF' }}>
                Sign in
              </Link>
            </p>
            <p className="text-gray-500 text-sm">
              Are you a home buyer?{' '}
              <Link href="/sign-up/buyer" className="font-medium hover:underline" style={{ color: '#006AFF' }}>
                Sign up as Buyer
              </Link>
            </p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            By signing up, you agree to our{' '}
            <Link href="#" className="hover:underline" style={{ color: '#006AFF' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link href="#" className="hover:underline" style={{ color: '#006AFF' }}>Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
