'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Suspense } from 'react';
import { FormInput } from '@/components/ui/FormInput';
import { emailSchema, passwordSchema, nameSchema } from '@/lib/validations';

const buyerSignUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type BuyerSignUpFormData = z.infer<typeof buyerSignUpSchema>;

function BuyerSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<BuyerSignUpFormData>({
    resolver: zodResolver(buyerSignUpSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: BuyerSignUpFormData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'BUYER',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError('root', {
          message: result.error?.message || 'Failed to create account',
        });
        return;
      }

      // If there's an invite token, accept the invite after registration
      if (inviteToken) {
        try {
          const acceptResponse = await fetch('/api/invites/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ token: inviteToken }),
          });

          if (!acceptResponse.ok) {
            // Log but don't fail - user is registered, they can accept later
            console.warn('Failed to auto-accept invite after registration');
          }
        } catch (err) {
          console.warn('Error accepting invite:', err);
        }
      }

      router.push('/client');
    } catch {
      setError('root', {
        message: 'An error occurred. Please try again.',
      });
    }
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
            <span className="text-2xl">🏠</span>
            <span className="text-white font-medium">For Home Buyers</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Find your perfect home with confidence
          </h1>
          <p className="text-blue-100 text-lg mb-8">
            Record your impressions during visits and let AI help you compare houses. Never forget how a home made you feel.
          </p>

          <ul className="space-y-4">
            {[
              { icon: '🎙️', text: 'Record voice notes room by room during visits' },
              { icon: '🤖', text: 'AI analyzes your recordings for key insights' },
              { icon: '⚖️', text: 'Compare homes side by side with your own words' },
              { icon: '❤️', text: 'Remember the feeling, not just the photos' },
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
              <span className="text-2xl">💬</span>
            </div>
            <div>
              <p className="text-white font-medium mb-1">
                &quot;We visited 12 houses and by house 8, they all blurred together. HomeTrace saved us - we could replay exactly what we loved about each one!&quot;
              </p>
              <p className="text-blue-200 text-sm">— Jennifer & Tom, First-time buyers</p>
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
                <span className="text-xl">🏠</span>
                <span className="font-medium text-sm" style={{ color: '#006AFF' }}>Home Buyer Account</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-2">
                Start your home search journey
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              {errors.root && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.root.message}
                </div>
              )}

              <FormInput
                id="name"
                type="text"
                label="Full name"
                placeholder="John Smith"
                autoComplete="name"
                error={errors.name}
                {...register('name')}
              />

              <FormInput
                id="email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email}
                {...register('email')}
              />

              <FormInput
                id="password"
                type="password"
                label="Password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                error={errors.password}
                hint="Must be at least 8 characters"
                {...register('password')}
              />

              <FormInput
                id="confirmPassword"
                type="password"
                label="Confirm password"
                placeholder="Confirm your password"
                autoComplete="new-password"
                error={errors.confirmPassword}
                {...register('confirmPassword')}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full text-white py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: isSubmitting ? '#6B6B76' : 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
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
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">GitHub</span>
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
              Are you a realtor?{' '}
              <Link href="/sign-up/realtor" className="font-medium hover:underline" style={{ color: '#0D47A1' }}>
                Sign up as Realtor
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

export default function BuyerSignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(to bottom right, #E3F2FD, #BBDEFB, #E3F2FD)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#006AFF]"></div>
      </div>
    }>
      <BuyerSignUpForm />
    </Suspense>
  );
}
