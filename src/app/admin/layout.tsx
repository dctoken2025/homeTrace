'use client'

import Link from 'next/link'
import { useRequireAuth } from '@/hooks/useAuth'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading, logout } = useRequireAuth('ADMIN')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: '#006AFF' }}></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #006AFF 0%, #0D47A1 100%)' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">HomeTrace</h1>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </Link>
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/admin/users" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Users
              </Link>
              <Link href="/admin/houses" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Houses
              </Link>
              <Link href="/admin/config" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Integrations
              </Link>
              <Link href="/admin/logs" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Logs
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
