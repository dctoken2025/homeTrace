'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'

// Dados de exemplo
const stats = [
  { label: 'Total', value: '12' },
  { label: 'Scheduled', value: '5' },
  { label: 'Completed', value: '7' },
]

export default function HeaderExamplesPage() {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-16">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Header Design Options</h1>
        <p className="text-gray-600">Escolha a opção que melhor se adequa ao estilo do sistema</p>
      </div>

      {/* ========== OPÇÃO 1: Header com Background Gradient ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">1</span>
          <h2 className="text-xl font-semibold text-gray-900">Header com Gradient Background</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-600 to-blue-400 px-8 py-8">
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
              </div>

              <Button className="bg-white text-blue-600 hover:bg-blue-50 border-0 shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Schedule Visit
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6 mt-6 ml-12">
              {stats.map((stat) => (
                <div key={stat.label} className="text-white">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-blue-200 text-xs uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== OPÇÃO 2: Header Clean com Breadcrumb ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">2</span>
          <h2 className="text-xl font-semibold text-gray-900">Header Clean com Breadcrumb e Stats</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-8 py-6 border-b border-gray-100">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <span>Dashboard</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">Visit Calendar</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Visit Calendar</h1>
                  <p className="text-gray-500">Schedule and manage your house visits</p>
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

          {/* Stats Bar */}
          <div className="px-8 py-4 bg-gray-50 flex items-center gap-8">
            {[
              { label: 'Total Visits', value: '12', color: 'text-gray-900' },
              { label: 'Scheduled', value: '5', color: 'text-blue-600' },
              { label: 'In Progress', value: '2', color: 'text-amber-600' },
              { label: 'Completed', value: '5', color: 'text-green-600' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-3">
                {i > 0 && <div className="w-px h-8 bg-gray-200" />}
                <div>
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== OPÇÃO 3: Header Card Elevado ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">3</span>
          <h2 className="text-xl font-semibold text-gray-900">Header Card Elevado com Ícone Grande</h2>
        </div>

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
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-gray-600">7 completed</span>
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
      </section>

      {/* ========== OPÇÃO 4: Header Minimalista com Linha ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">4</span>
          <h2 className="text-xl font-semibold text-gray-900">Header Minimalista com Linha Accent</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="relative px-8 py-8">
            {/* Accent Line */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-600 to-blue-400"></div>

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">Visit Calendar</h1>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    5 pending
                  </span>
                </div>
                <p className="text-gray-500">Schedule and manage your house visits</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4 hidden sm:block">
                  <div className="text-sm text-gray-500">This month</div>
                  <div className="text-lg font-bold text-gray-900">12 visits</div>
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
        </div>
      </section>

      {/* ========== OPÇÃO 5: Header com Background Pattern ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">5</span>
          <h2 className="text-xl font-semibold text-gray-900">Header com Background Sutil e Pattern</h2>
        </div>

        <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-60"></div>
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          ></div>

          <div className="relative px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Visit Calendar</h1>
                  <p className="text-gray-600">Schedule and manage your house visits</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Quick Actions */}
                <div className="hidden md:flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/80 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/80 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </button>
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
        </div>
      </section>

      {/* ========== OPÇÃO 6: Header Compacto Moderno ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">6</span>
          <h2 className="text-xl font-semibold text-gray-900">Header Compacto e Moderno</h2>
        </div>

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
      </section>

      {/* ========== OPÇÃO 7: Header Split com Ilustração ========== */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">7</span>
          <h2 className="text-xl font-semibold text-gray-900">Header Split Layout</h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex">
            {/* Left Side - Content */}
            <div className="flex-1 px-8 py-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Visit Calendar</h1>
              <p className="text-gray-500 mb-6">Schedule and manage your house visits with ease. Track upcoming appointments and stay organized.</p>

              <div className="flex items-center gap-4">
                <Button>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Schedule Visit
                </Button>
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
                  View all
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Side - Stats/Visual */}
            <div className="hidden md:flex flex-col justify-center gap-4 px-8 py-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-l border-gray-100 min-w-[240px]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">5</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Scheduled</div>
                  <div className="text-xs text-gray-500">This week</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">7</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Completed</div>
                  <div className="text-xs text-gray-500">This month</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-12">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 mb-1">Comparação com o Layout Atual</h3>
            <p className="text-amber-700 text-sm">
              O header atual é muito básico - apenas título, subtítulo e botão sem padding adequado ou elementos visuais.
              Todas as opções acima adicionam: mais respiro vertical (padding), ícones contextuais, cores/gradientes sutis,
              e em alguns casos métricas rápidas para dar mais contexto ao usuário.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">Minha Recomendação</h3>
            <p className="text-blue-700 text-sm mb-3">
              <strong>Opção 3</strong> (Header Card Elevado) ou <strong>Opção 6</strong> (Compacto Moderno) são as melhores escolhas.
              Elas oferecem um bom equilíbrio entre visual profissional e não ocupam muito espaço vertical.
              A Opção 3 é ideal para dashboards principais, enquanto a Opção 6 funciona bem para páginas secundárias.
            </p>
            <p className="text-blue-600 text-xs">
              Acesse: <code className="bg-blue-100 px-1 rounded">/header-examples</code> para ver esta página
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
