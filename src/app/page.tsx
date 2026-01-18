'use client';

import Link from 'next/link';
import { HeroImageCarousel } from '@/components/HeroImageCarousel';
import { useAuth } from '@/hooks/useAuth';

export default function LandingPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const getDashboardLink = () => {
    if (!user) return '/client';
    switch (user.role) {
      case 'ADMIN':
        return '/admin';
      case 'REALTOR':
        return '/realtor';
      default:
        return '/client';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">HomeTrace</span>
            </div>
            <div className="flex items-center gap-4">
              {isLoading ? (
                <div className="h-10 w-32 bg-gray-100 rounded-lg animate-pulse" />
              ) : isAuthenticated && user ? (
                <>
                  <span className="text-gray-600 hidden sm:inline">
                    Hi, {user.name?.split(' ')[0] || 'User'}
                  </span>
                  <Link
                    href={getDashboardLink()}
                    className="text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-6" style={{ background: '#E3F2FD', color: '#006AFF' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#006AFF' }}></span>
                AI-Powered Home Search
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Clarity for every step toward your{' '}
                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)', WebkitBackgroundClip: 'text' }}>
                  home
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Capture your impressions during each visit and let AI turn them into clear, memorable comparisons—so choosing the right home feels easy.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}
                >
                  Start Free Trial
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-200 transition-all"
                >
                  See How It Works
                </Link>
              </div>
              <div className="flex items-center gap-8 mt-10 pt-10 border-t border-gray-100">
                <div>
                  <p className="text-3xl font-bold text-gray-900">500+</p>
                  <p className="text-gray-500">Happy Buyers</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">2,000+</p>
                  <p className="text-gray-500">Houses Compared</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">4.9</p>
                  <p className="text-gray-500">User Rating</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20 transform rotate-6" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}></div>
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 shadow-2xl">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                  <HeroImageCarousel />
                  <div className="p-4">
                    <p className="font-bold text-gray-900">$485,000</p>
                    <p className="text-sm text-gray-500">123 Oak Street, Austin TX</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-2xl">😍</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full w-4/5" style={{ background: '#006AFF' }}></div>
                      </div>
                      <span className="text-sm font-medium" style={{ color: '#006AFF' }}>8 recordings</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-xl p-4" style={{ background: '#E3F2FD' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#BBDEFB' }}>
                      <svg className="w-4 h-4" style={{ color: '#006AFF' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#0D47A1' }}>Kitchen Notes</p>
                      <p className="text-xs mt-1" style={{ color: '#006AFF' }}>&quot;Love the natural light, quartz countertops are beautiful...&quot;</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              How HomeTrace Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three simple steps to find your perfect home with confidence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Record Your Visits',
                description: 'Walk through each room and record your voice impressions. Capture how you feel in real-time.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: 'AI Analysis',
                description: 'Our AI transcribes and analyzes your recordings, identifying key themes and sentiments.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: 'Compare & Decide',
                description: 'See side-by-side comparisons with AI insights to make confident decisions.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div className="absolute -top-4 left-8 text-white px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
                  {item.step}
                </div>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6" style={{ background: '#E3F2FD', color: '#006AFF' }}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Never forget how a house made you feel
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                After visiting 5+ homes, they all start to blur together. HomeTrace preserves your authentic first impressions so you can make decisions with clarity.
              </p>
              <ul className="space-y-4">
                {[
                  'Voice recordings organized by room',
                  'AI-powered sentiment analysis',
                  'Side-by-side house comparisons',
                  'Shareable reports with your realtor',
                  'Works offline during visits',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                      <svg className="w-4 h-4" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl blur-3xl opacity-20 transform -rotate-6" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}></div>
              <div className="relative grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🛋️</span>
                      <span className="font-medium text-gray-900">Living Room</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full w-3/4" style={{ background: '#006AFF' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">2 recordings</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🍳</span>
                      <span className="font-medium text-gray-900">Kitchen</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full w-full" style={{ background: '#006AFF' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">3 recordings</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🛏️</span>
                      <span className="font-medium text-gray-900">Master Bed</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full w-1/2" style={{ background: '#006AFF' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">1 recording</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">🌳</span>
                      <span className="font-medium text-gray-900">Backyard</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full">
                      <div className="h-2 rounded-full w-2/3" style={{ background: '#006AFF' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">2 recordings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to find your perfect home?
          </h2>
          <p className="text-xl mb-8" style={{ color: '#BBDEFB' }}>
            Join thousands of home buyers who made confident decisions with HomeTrace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center bg-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all shadow-lg"
              style={{ color: '#006AFF' }}
            >
              Get Started Free
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all border"
              style={{ background: '#0D47A1', borderColor: '#006AFF' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">HomeTrace</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} HomeTrace. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
