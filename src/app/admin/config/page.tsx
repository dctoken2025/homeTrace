'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button, { LoadingSpinner } from '@/components/ui/Button'
import { NetworkError } from '@/components/ui/ErrorState'
import { toast } from '@/components/ui/Toast'

interface ConfigData {
  anthropic: {
    configured: boolean
    lastUsed: string | null
    usageCount: number
  }
  resend: {
    configured: boolean
    lastUsed: string | null
    usageCount: number
  }
  realtyApi: {
    configured: boolean
    lastUsed: string | null
    usageCount: number
    monthlyLimit: number
    monthlyUsage: number
  }
  storage: {
    path: string
    configured: boolean
  }
  jwt: {
    configured: boolean
    expiresIn: string
  }
}

interface ApiKeyForm {
  anthropicKey: string
  resendKey: string
  rapidApiKey: string
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showKeys, setShowKeys] = useState(false)
  const [formData, setFormData] = useState<ApiKeyForm>({
    anthropicKey: '',
    resendKey: '',
    rapidApiKey: '',
  })
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({
    anthropic: null,
    resend: null,
    realtyApi: null,
  })

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/config', {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to fetch config')
      }

      setConfig(data.data)
    } catch (err) {
      console.error('Fetch config error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const testConnection = async (service: 'anthropic' | 'resend' | 'realtyApi') => {
    setTestResults((prev) => ({ ...prev, [service]: 'testing' }))

    try {
      const response = await fetch(`/api/admin/config/test/${service}`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()

      if (data.success) {
        setTestResults((prev) => ({ ...prev, [service]: 'success' }))
        toast.success(`${service} connection successful!`)
      } else {
        setTestResults((prev) => ({ ...prev, [service]: 'error' }))
        toast.error(data.error?.message || `${service} connection failed`)
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [service]: 'error' }))
      toast.error(`Failed to test ${service} connection`)
    }
  }

  const saveConfig = async () => {
    setSaving(true)

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anthropicKey: formData.anthropicKey || undefined,
          resendKey: formData.resendKey || undefined,
          rapidApiKey: formData.rapidApiKey || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save config')
      }

      toast.success('Configuration saved successfully!')
      setFormData({ anthropicKey: '', resendKey: '', rapidApiKey: '' })
      fetchConfig()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return <NetworkError onRetry={fetchConfig} />
  }

  if (!config) return null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Configuration</h1>
        <p className="text-gray-500 mt-1">Manage API keys and integrations</p>
      </div>

      {/* API Status Overview */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Anthropic */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Anthropic AI</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                config.anthropic.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {config.anthropic.configured ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {config.anthropic.usageCount} requests
              {config.anthropic.lastUsed && (
                <> · Last used {new Date(config.anthropic.lastUsed).toLocaleDateString()}</>
              )}
            </p>
          </Card>

          {/* Resend */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Resend Email</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                config.resend.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {config.resend.configured ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {config.resend.usageCount} emails sent
              {config.resend.lastUsed && (
                <> · Last used {new Date(config.resend.lastUsed).toLocaleDateString()}</>
              )}
            </p>
          </Card>

          {/* Realty API */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Realty in US</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                config.realtyApi.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {config.realtyApi.configured ? 'Configured' : 'Not Set'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {config.realtyApi.monthlyUsage} / {config.realtyApi.monthlyLimit} monthly
            </p>
            {config.realtyApi.monthlyUsage > config.realtyApi.monthlyLimit * 0.8 && (
              <p className="text-xs text-amber-600 mt-1">
                Approaching monthly limit
              </p>
            )}
          </Card>

          {/* Storage */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Storage</span>
              <span className={`px-2 py-1 text-xs rounded-full ${
                config.storage.configured
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {config.storage.configured ? 'Configured' : 'Default'}
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate" title={config.storage.path}>
              Path: {config.storage.path}
            </p>
          </Card>
        </div>
      </div>

      {/* API Key Management */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {showKeys ? 'Hide Form' : 'Update Keys'}
          </button>
        </div>

        {showKeys && (
          <Card className="space-y-6">
            {/* Anthropic */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Anthropic API Key
                </label>
                <button
                  onClick={() => testConnection('anthropic')}
                  disabled={testResults.anthropic === 'testing'}
                  className="text-xs px-2 py-1 rounded text-white disabled:opacity-50"
                  style={{ background: '#006AFF' }}
                >
                  {testResults.anthropic === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <input
                type="password"
                value={formData.anthropicKey}
                onChange={(e) => setFormData({ ...formData, anthropicKey: e.target.value })}
                placeholder={config.anthropic.configured ? '••••••••••••••••' : 'sk-ant-...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {testResults.anthropic && (
                <p className={`text-xs mt-1 ${testResults.anthropic === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.anthropic === 'success' ? '✓ Connection successful' : '✗ Connection failed'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Used for AI chat, transcription analysis, match scoring, and report generation
              </p>
            </div>

            {/* Resend */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Resend API Key
                </label>
                <button
                  onClick={() => testConnection('resend')}
                  disabled={testResults.resend === 'testing'}
                  className="text-xs px-2 py-1 rounded text-white disabled:opacity-50"
                  style={{ background: '#006AFF' }}
                >
                  {testResults.resend === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <input
                type="password"
                value={formData.resendKey}
                onChange={(e) => setFormData({ ...formData, resendKey: e.target.value })}
                placeholder={config.resend.configured ? '••••••••••••••••' : 're_...'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {testResults.resend && (
                <p className={`text-xs mt-1 ${testResults.resend === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.resend === 'success' ? '✓ Connection successful' : '✗ Connection failed'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Used for sending invite emails, password reset emails, and notifications
              </p>
            </div>

            {/* RapidAPI */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  RapidAPI Key (Realty in US)
                </label>
                <button
                  onClick={() => testConnection('realtyApi')}
                  disabled={testResults.realtyApi === 'testing'}
                  className="text-xs px-2 py-1 rounded text-white disabled:opacity-50"
                  style={{ background: '#006AFF' }}
                >
                  {testResults.realtyApi === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              <input
                type="password"
                value={formData.rapidApiKey}
                onChange={(e) => setFormData({ ...formData, rapidApiKey: e.target.value })}
                placeholder={config.realtyApi.configured ? '••••••••••••••••' : 'Your RapidAPI key'}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {testResults.realtyApi && (
                <p className={`text-xs mt-1 ${testResults.realtyApi === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testResults.realtyApi === 'success' ? '✓ Connection successful' : '✗ Connection failed'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Used for searching and fetching property data. Monthly limit: 500 requests.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowKeys(false)
                  setFormData({ anthropicKey: '', resendKey: '', rapidApiKey: '' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={saveConfig}
                isLoading={saving}
                disabled={!formData.anthropicKey && !formData.resendKey && !formData.rapidApiKey}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* System Info */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">JWT Token Expiry</p>
              <p className="font-medium">{config.jwt.expiresIn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage Path</p>
              <p className="font-medium font-mono text-sm">{config.storage.path}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Alerts */}
      {config.realtyApi.monthlyUsage > config.realtyApi.monthlyLimit * 0.8 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-amber-800">API Usage Warning</h3>
              <p className="text-sm text-amber-700 mt-1">
                You have used {config.realtyApi.monthlyUsage} of {config.realtyApi.monthlyLimit} monthly Realty API requests
                ({Math.round((config.realtyApi.monthlyUsage / config.realtyApi.monthlyLimit) * 100)}%).
                Consider upgrading your plan or limiting property searches.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
