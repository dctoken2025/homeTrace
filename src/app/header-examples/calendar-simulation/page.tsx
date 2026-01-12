'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

// Componente fake do calendário para simulação
function FakeCalendar() {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const currentDate = new Date()
  const currentMonth = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })

  // Gerar dias do mês
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    // Dias vazios antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    return days
  }

  const monthDays = getDaysInMonth()

  // Eventos fake
  const events: Record<number, { title: string; color: string }[]> = {
    8: [{ title: '123 Oak St', color: 'bg-blue-500' }],
    12: [{ title: '456 Pine Ave', color: 'bg-blue-500' }, { title: '789 Elm Dr', color: 'bg-green-500' }],
    15: [{ title: '321 Maple Ln', color: 'bg-amber-500' }],
    20: [{ title: '654 Cedar Rd', color: 'bg-blue-500' }],
    25: [{ title: '987 Birch Way', color: 'bg-green-500' }],
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Calendar Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-900">{currentMonth}</h2>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Today
          </button>
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md">Month</button>
            <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900">Week</button>
            <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900">Day</button>
          </div>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {days.map((day) => (
          <div key={day} className="px-2 py-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {monthDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[100px] border-b border-r border-gray-100 p-2 ${
              day === currentDate.getDate() ? 'bg-blue-50' : ''
            } ${day ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
          >
            {day && (
              <>
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 text-sm ${
                    day === currentDate.getDate()
                      ? 'bg-blue-600 text-white rounded-full font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {day}
                </span>
                {/* Events */}
                <div className="mt-1 space-y-1">
                  {events[day]?.map((event, i) => (
                    <div
                      key={i}
                      className={`${event.color} text-white text-xs px-2 py-1 rounded truncate`}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Stats Cards Component
function StatsCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-gray-900">12</div>
        <div className="text-sm text-gray-500">Total Visits</div>
      </div>
      <div className="bg-white rounded-lg p-4 border border-blue-200">
        <div className="text-2xl font-bold text-blue-600">5</div>
        <div className="text-sm text-gray-500">Scheduled</div>
      </div>
      <div className="bg-white rounded-lg border border-amber-200 p-4">
        <div className="text-2xl font-bold text-amber-600">2</div>
        <div className="text-sm text-gray-500">In Progress</div>
      </div>
      <div className="bg-white rounded-lg border border-green-200 p-4">
        <div className="text-2xl font-bold text-green-600">5</div>
        <div className="text-sm text-gray-500">Completed</div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-gray-400">0</div>
        <div className="text-sm text-gray-500">Cancelled</div>
      </div>
    </div>
  )
}

export default function CalendarSimulationPage() {
  const [activeHeader, setActiveHeader] = useState<1 | 3 | 6>(3)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Selector - Floating */}
      <div className="sticky top-0 lg:top-4 z-40 mx-4 lg:mx-6 mt-0 lg:mt-4">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-none lg:rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Simulação - Página de Calendário</h1>
            <p className="text-xs text-gray-500">Selecione o header para comparar</p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 3, 6].map((num) => (
              <button
                key={num}
                onClick={() => setActiveHeader(num as 1 | 3 | 6)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeHeader === num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Header {num}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* ========== HEADER 1: Gradient Background ========== */}
        {activeHeader === 1 && (
          <>
            <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl px-8 py-8 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h1 className="text-2xl font-bold">Visit Calendar</h1>
                  </div>
                  <p className="text-blue-100 text-sm ml-12">Schedule and manage your house visits</p>

                  {/* Quick Stats */}
                  <div className="flex gap-6 mt-6 ml-12">
                    {[
                      { label: 'Total', value: '12' },
                      { label: 'Scheduled', value: '5' },
                      { label: 'Completed', value: '7' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-white">
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-blue-200 text-xs uppercase tracking-wide">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Button className="bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule Visit
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <FakeCalendar />
          </>
        )}

        {/* ========== HEADER 3: Card Elevado ========== */}
        {activeHeader === 3 && (
          <>
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="flex items-start justify-between">
                <div className="flex gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">5</span>
                    </div>
                  </div>

                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">Visit Calendar</h1>
                    <p className="text-gray-500 mb-4">Schedule and manage your house visits</p>

                    {/* Mini Stats */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span className="text-gray-600">5 scheduled</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span className="text-gray-600">2 in progress</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-gray-600">5 completed</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule Visit
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <FakeCalendar />
          </>
        )}

        {/* ========== HEADER 6: Compacto Moderno ========== */}
        {activeHeader === 6 && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-xl font-bold text-gray-900">Visit Calendar</h1>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-gray-500">2 today</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">Schedule and manage your house visits</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stats Pills */}
                  <div className="hidden lg:flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                      <span className="font-semibold text-gray-900">12</span>
                      <span className="text-gray-500 ml-1">total</span>
                    </span>
                    <span className="px-3 py-1.5 bg-blue-50 rounded-lg text-sm">
                      <span className="font-semibold text-blue-600">5</span>
                      <span className="text-blue-600/70 ml-1">scheduled</span>
                    </span>
                    <span className="px-3 py-1.5 bg-green-50 rounded-lg text-sm">
                      <span className="font-semibold text-green-600">5</span>
                      <span className="text-green-600/70 ml-1">completed</span>
                    </span>
                  </div>

                  <Button>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Schedule Visit
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Cards - para o header compacto, podemos manter os stats cards separados */}
            <StatsCards />

            {/* Calendar */}
            <FakeCalendar />
          </>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-blue-700">
                <strong>Header {activeHeader}:</strong>{' '}
                {activeHeader === 1 && 'Visual impactante com gradiente azul. Ideal para páginas principais onde você quer chamar atenção. Os stats ficam integrados no header.'}
                {activeHeader === 3 && 'Ícone grande com sombra e badge de notificação. Balanceado entre visual e funcionalidade. Stats inline economizam espaço.'}
                {activeHeader === 6 && 'Mais compacto e moderno. Bom para páginas secundárias. Stats em pills são discretos mas informativos.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
