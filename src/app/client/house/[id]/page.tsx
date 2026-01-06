'use client';

import { use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import HouseGallery from '@/components/houses/HouseGallery';
import AudioTimeline from '@/components/audio/AudioTimeline';
import { getHouseById, getVisitByHouseId, formatPrice, formatDate } from '@/data/mock';
import { IMPRESSION_EMOJIS } from '@/types';

interface HouseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function HouseDetailPage({ params }: HouseDetailPageProps) {
  const { id } = use(params);
  const house = getHouseById(id);
  const visit = getVisitByHouseId(id);

  if (!house) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <Link
        href="/client/houses"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Houses
      </Link>

      {/* Gallery */}
      <HouseGallery images={house.images} address={house.address} />

      {/* House Info */}
      <div className="mt-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formatPrice(house.price)}</h1>
            <p className="text-lg text-gray-600">{house.address}</p>
            <p className="text-gray-500">{house.city}, {house.state} {house.zipCode}</p>
          </div>
          {visit?.overallImpression && (
            <span className="text-4xl">{IMPRESSION_EMOJIS[visit.overallImpression]}</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 text-gray-600">
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>{house.bedrooms} bed</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <span>{house.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span>{house.sqft.toLocaleString()} sqft</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Built {house.yearBuilt}</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6">
        <Link href={`/client/house/${house.id}/visit`}>
          <Button size="lg" className="w-full sm:w-auto">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            {visit ? 'Continue Recording' : 'Start Visit Recording'}
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        {/* Description */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About this home</h2>
          <p className="text-gray-600">{house.description}</p>

          <h3 className="text-sm font-semibold text-gray-900 mt-4 mb-2">Features</h3>
          <div className="flex flex-wrap gap-2">
            {house.features.map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded"
              >
                {feature}
              </span>
            ))}
          </div>
        </Card>

        {/* Visit Summary */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Visit</h2>

          {visit ? (
            <>
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-sm text-gray-500">Visited on</p>
                  <p className="font-medium text-gray-900">{formatDate(visit.visitedAt)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Recordings</p>
                  <p className="font-medium text-gray-900">{visit.recordings.length}</p>
                </div>
              </div>

              {visit.notes && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-700">{visit.notes}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Overall impression</p>
                  <p className="text-2xl">
                    {visit.overallImpression ? IMPRESSION_EMOJIS[visit.overallImpression] : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Would buy?</p>
                  <p className="font-medium text-gray-900">
                    {visit.wouldBuy === true ? 'Yes' : visit.wouldBuy === false ? 'No' : '—'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <p>You haven't visited this house yet</p>
              <p className="text-sm mt-1">Start recording your impressions</p>
            </div>
          )}
        </Card>
      </div>

      {/* Recordings */}
      {visit && visit.recordings.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Recordings</h2>
          <AudioTimeline recordings={visit.recordings} />
        </Card>
      )}
    </div>
  );
}
