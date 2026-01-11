'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

const houseImages = [
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
];

export function HeroImageCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % houseImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 overflow-hidden">
      {houseImages.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Beautiful home ${index + 1}`}
          fill
          className={`object-cover transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          priority={index === 0}
        />
      ))}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-medium" style={{ color: '#006AFF' }}>
        Visited
      </div>
      {/* Indicadores */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {houseImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-white w-4'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
