'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignUpSelectContent() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  // Build URLs with invite token if present
  const buyerUrl = inviteToken ? `/sign-up/buyer?invite=${inviteToken}` : '/sign-up/buyer';
  const realtorUrl = '/sign-up/realtor';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB, #E3F2FD)' }}>
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mb-12">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <span className="text-2xl font-bold text-gray-900">HomeTrace</span>
      </Link>

      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          How will you use HomeTrace?
        </h1>
        <p className="text-gray-600 text-lg">
          Choose your account type to get started
        </p>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Home Buyer Card */}
        <Link href={buyerUrl} className="group">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-2 border-transparent h-full" style={{ ['--hover-border' as string]: '#006AFF' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#006AFF'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors" style={{ background: '#E3F2FD' }}>
              <span className="text-4xl">🏠</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Home Buyer</h2>
            <p className="text-gray-600 mb-6">
              Looking for my perfect home and want to make confident decisions with AI-powered insights.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Record impressions during house visits',
                'AI analysis of your voice notes',
                'Compare houses side by side',
                'Never forget how a home made you feel',
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#006AFF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center font-semibold group-hover:gap-3 gap-2 transition-all" style={{ color: '#006AFF' }}>
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Realtor Card */}
        <Link href={realtorUrl} className="group">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border-2 border-transparent h-full" onMouseEnter={(e) => e.currentTarget.style.borderColor = '#0D47A1'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors" style={{ background: '#BBDEFB' }}>
              <span className="text-4xl">💼</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">I&apos;m a Realtor</h2>
            <p className="text-gray-600 mb-6">
              Help my clients find their dream home with better organization and insights.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Manage multiple clients and their searches',
                'Schedule and plan visit routes',
                'Access client recordings and insights',
                'Close deals faster with clarity',
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: '#0D47A1' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center font-semibold group-hover:gap-3 gap-2 transition-all" style={{ color: '#0D47A1' }}>
              Start Free Trial
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* Sign In Link */}
      <p className="text-gray-600 mt-10">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-semibold hover:underline" style={{ color: '#006AFF' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignUpSelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB, #E3F2FD)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006AFF]"></div>
      </div>
    }>
      <SignUpSelectContent />
    </Suspense>
  );
}
