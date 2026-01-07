'use client';

import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import { House, HouseVisit, IMPRESSION_EMOJIS } from '@/types';
import { formatPrice } from '@/lib/realty-api';

interface HouseCardProps {
  house: House;
  visit?: HouseVisit;
  linkPrefix: string;
  showAddedBy?: boolean;
}

export default function HouseCard({ house, visit, linkPrefix, showAddedBy = false }: HouseCardProps) {
  const recordingCount = visit?.recordings.length ?? 0;

  return (
    <Link href={`${linkPrefix}/${house.id}`}>
      <Card padding="none" className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
        <div className="relative h-48">
          <Image
            src={house.images[0]}
            alt={house.address}
            fill
            className="object-cover"
          />
          {showAddedBy && (
            <span
              className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium"
              style={house.addedBy === 'realtor'
                ? { background: '#E3F2FD', color: '#006AFF' }
                : { background: '#dcfce7', color: '#16a34a' }
              }
            >
              {house.addedBy === 'realtor' ? 'Realtor' : 'You'}
            </span>
          )}
          {visit && (
            <div className="absolute top-2 right-2 flex gap-2">
              {visit.overallImpression && (
                <span className="bg-white rounded-full px-2 py-1 text-lg shadow">
                  {IMPRESSION_EMOJIS[visit.overallImpression]}
                </span>
              )}
              {recordingCount > 0 && (
                <span className="bg-white rounded-full px-2 py-1 text-xs font-medium shadow flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  {recordingCount}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="p-4">
          <p className="text-xl font-bold text-gray-900">{formatPrice(house.price)}</p>
          <p className="text-sm text-gray-600 mt-1">{house.address}</p>
          <p className="text-sm text-gray-500">{house.city}, {house.state} {house.zipCode}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
            <span>{house.bedrooms} bed</span>
            <span>{house.bathrooms} bath</span>
            <span>{house.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
