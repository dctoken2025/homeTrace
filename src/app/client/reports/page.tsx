'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { format } from 'date-fns'

interface ReportSummary {
  id: string
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED'
  language: string
  housesAnalyzed: number
  recordingsAnalyzed: number
  recommendedHouseId: string | null
  generationStartedAt: string | null
  generationCompletedAt: string | null
  errorMessage: string | null
  createdAt: string
}

interface HouseRanking {
  houseId: string
  rank: number
  score: number
  matchPercentage: number
  pros: string[]
  cons: string[]
  recommendation: string
}

interface ReportContent {
  summary: string
  overallRecommendation: string
  topPick: {
    houseId: string
    reason: string
  } | null
  rankings: HouseRanking[]
  insights: {
    category: string
    observation: string
    suggestion: string
  }[]
  nextSteps: string[]
}

interface HouseInfo {
  id: string
  address: string
  city: string
  state: string
  price: number | null
  images: string[]
}

interface ReportDetails extends ReportSummary {
  content: ReportContent | null
  houses: HouseInfo[]
  recommendedHouse: HouseInfo | null
}

export default function ReportsPage() {
  const router = useRouter()
  const { success, error: showError } = useToast()

  const [reports, setReports] = useState<ReportSummary[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)

  // Fetch reports
  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reports')
      const data = await response.json()

      if (response.ok) {
        setReports(data.data || [])
      } else {
        throw new Error(data.error?.message || 'Failed to load reports')
      }
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  // Generate new report
  const handleGenerate = async () => {
    setGenerating(true)

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'en' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate report')
      }

      success('Report Generated', 'Your AI report is ready!')
      fetchReports()

      // Auto-select the new report
      if (data.data.reportId) {
        loadReport(data.data.reportId)
      }
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  // Load report details
  const loadReport = async (reportId: string) => {
    setLoadingReport(true)

    try {
      const response = await fetch(`/api/reports/${reportId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to load report')
      }

      setSelectedReport(data.data)
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoadingReport(false)
    }
  }

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'GENERATING':
        return 'bg-blue-100 text-blue-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get house by ID from report
  const getHouse = (houseId: string): HouseInfo | undefined => {
    return selectedReport?.houses.find((h) => h.id === houseId)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Reports</h1>
          <p className="text-gray-600">
            Get AI-powered analysis of your houses and visits
          </p>
        </div>

        <Button onClick={handleGenerate} isLoading={generating}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Your Reports</h2>

            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>No reports yet</p>
                <p className="text-sm mt-1">Generate your first AI report</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => loadReport(report.id)}
                    className="w-full text-left p-3 rounded-lg border transition-colors"
                    style={
                      selectedReport?.id === report.id
                        ? { borderColor: '#006AFF', background: '#E3F2FD' }
                        : { borderColor: '#E5E7EB' }
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {format(new Date(report.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">
                      {report.housesAnalyzed} houses analyzed
                    </p>
                    {report.recordingsAnalyzed > 0 && (
                      <p className="text-xs text-gray-500">
                        {report.recordingsAnalyzed} recordings
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Report Details */}
        <div className="lg:col-span-2">
          {loadingReport ? (
            <Card>
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-32 bg-gray-200 rounded" />
                <div className="h-48 bg-gray-200 rounded" />
              </div>
            </Card>
          ) : selectedReport ? (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <h2 className="font-semibold text-gray-900 mb-4">Report Summary</h2>

                {selectedReport.content ? (
                  <>
                    <p className="text-gray-700 mb-4">{selectedReport.content.summary}</p>

                    <div className="rounded-lg p-4 mb-4" style={{ background: '#E3F2FD', borderWidth: '1px', borderStyle: 'solid', borderColor: '#BBDEFB' }}>
                      <h3 className="font-medium mb-2" style={{ color: '#0D47A1' }}>Recommendation</h3>
                      <p style={{ color: '#1565C0' }}>{selectedReport.content.overallRecommendation}</p>
                    </div>

                    {selectedReport.recommendedHouse && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-medium text-green-900 mb-2">Top Pick</h3>
                        <div className="flex items-center gap-4">
                          {selectedReport.recommendedHouse.images?.[0] && (
                            <img
                              src={selectedReport.recommendedHouse.images[0]}
                              alt={selectedReport.recommendedHouse.address}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {selectedReport.recommendedHouse.address}
                            </p>
                            <p className="text-sm text-gray-600">
                              {selectedReport.recommendedHouse.city}, {selectedReport.recommendedHouse.state}
                            </p>
                            {selectedReport.recommendedHouse.price && (
                              <p className="text-lg font-bold text-green-600">
                                ${selectedReport.recommendedHouse.price.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedReport.content.topPick?.reason && (
                          <p className="mt-2 text-sm text-green-700">
                            {selectedReport.content.topPick.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500">
                    {selectedReport.status === 'FAILED'
                      ? `Report generation failed: ${selectedReport.errorMessage}`
                      : 'Report content not available'}
                  </p>
                )}
              </Card>

              {/* Rankings */}
              {selectedReport.content?.rankings && selectedReport.content.rankings.length > 0 && (
                <Card>
                  <h2 className="font-semibold text-gray-900 mb-4">House Rankings</h2>

                  <div className="space-y-4">
                    {selectedReport.content.rankings.map((ranking) => {
                      const house = getHouse(ranking.houseId)
                      if (!house) return null

                      return (
                        <div
                          key={ranking.houseId}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center font-bold" style={{ background: '#006AFF' }}>
                              #{ranking.rank}
                            </div>

                            {house.images?.[0] && (
                              <img
                                src={house.images[0]}
                                alt={house.address}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 truncate">
                                  {house.address}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-500">Score:</span>
                                  <span className={`font-bold ${
                                    ranking.score >= 80 ? 'text-green-600' :
                                    ranking.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {ranking.score}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">
                                {house.city}, {house.state}
                              </p>
                              {house.price && (
                                <p className="font-semibold" style={{ color: '#006AFF' }}>
                                  ${house.price.toLocaleString()}
                                </p>
                              )}

                              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <p className="font-medium text-green-700">Pros:</p>
                                  <ul className="text-green-600 text-xs">
                                    {ranking.pros.slice(0, 3).map((pro, i) => (
                                      <li key={i}>+ {pro}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-medium text-red-700">Cons:</p>
                                  <ul className="text-red-600 text-xs">
                                    {ranking.cons.slice(0, 3).map((con, i) => (
                                      <li key={i}>- {con}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              <p className="mt-2 text-xs text-gray-600 italic">
                                {ranking.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )}

              {/* Insights */}
              {selectedReport.content?.insights && selectedReport.content.insights.length > 0 && (
                <Card>
                  <h2 className="font-semibold text-gray-900 mb-4">Key Insights</h2>

                  <div className="space-y-3">
                    {selectedReport.content.insights.map((insight, i) => (
                      <div key={i} className="border-l-4 pl-4 py-2" style={{ borderColor: '#006AFF' }}>
                        <p className="text-xs font-medium uppercase" style={{ color: '#006AFF' }}>
                          {insight.category}
                        </p>
                        <p className="text-gray-900">{insight.observation}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-medium">Suggestion:</span> {insight.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Next Steps */}
              {selectedReport.content?.nextSteps && selectedReport.content.nextSteps.length > 0 && (
                <Card>
                  <h2 className="font-semibold text-gray-900 mb-4">Recommended Next Steps</h2>

                  <ol className="space-y-2">
                    {selectedReport.content.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <span className="text-gray-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-lg font-medium">Select a report to view</p>
                <p className="text-sm mt-1">
                  Or generate a new AI report to get personalized recommendations
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
