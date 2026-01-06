import { House, ScheduledVisit, HouseVisit, Client } from '@/types';

export const mockClient: Client = {
  id: 'client-1',
  name: 'John Smith',
  email: 'john.smith@email.com',
  phone: '(512) 555-0123',
};

export const mockHouses: House[] = [
  {
    id: 'house-1',
    zillowUrl: 'https://www.zillow.com/homedetails/123-oak-street',
    address: '123 Oak Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    price: 485000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    yearBuilt: 2018,
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
    ],
    description: 'Beautiful modern home in the heart of Austin. Open floor plan with high ceilings, hardwood floors throughout, and a stunning kitchen with quartz countertops.',
    features: ['Hardwood floors', 'Quartz countertops', 'Smart home', 'Energy efficient', '2-car garage'],
    addedBy: 'realtor',
    addedAt: new Date('2024-01-15'),
  },
  {
    id: 'house-2',
    zillowUrl: 'https://www.zillow.com/homedetails/456-maple-ave',
    address: '456 Maple Avenue',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    price: 625000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    yearBuilt: 2020,
    images: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
    ],
    description: 'Spacious family home with a large backyard. Features a gourmet kitchen, primary suite with spa-like bathroom, and a dedicated home office.',
    features: ['Pool', 'Home office', 'Gourmet kitchen', 'Walk-in closets', 'Covered patio'],
    addedBy: 'realtor',
    addedAt: new Date('2024-01-16'),
  },
  {
    id: 'house-3',
    zillowUrl: 'https://www.zillow.com/homedetails/789-elm-drive',
    address: '789 Elm Drive',
    city: 'Round Rock',
    state: 'TX',
    zipCode: '78665',
    price: 399000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1650,
    yearBuilt: 2015,
    images: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800',
    ],
    description: 'Charming home in a quiet neighborhood. Updated kitchen and bathrooms, nice backyard with mature trees, and close to excellent schools.',
    features: ['Updated kitchen', 'Mature trees', 'Corner lot', 'New HVAC', 'Near schools'],
    addedBy: 'client',
    addedAt: new Date('2024-01-18'),
  },
  {
    id: 'house-4',
    zillowUrl: 'https://www.zillow.com/homedetails/321-pine-lane',
    address: '321 Pine Lane',
    city: 'Cedar Park',
    state: 'TX',
    zipCode: '78613',
    price: 550000,
    bedrooms: 4,
    bathrooms: 2.5,
    sqft: 2200,
    yearBuilt: 2019,
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800',
      'https://images.unsplash.com/photo-1600573472591-ee6c563aaec8?w=800',
    ],
    description: 'Modern craftsman style home with open concept living. Features include a chef\'s kitchen, large island, and a beautiful primary suite.',
    features: ['Chef\'s kitchen', 'Large island', 'Craftsman style', 'Open concept', 'Large lot'],
    addedBy: 'realtor',
    addedAt: new Date('2024-01-20'),
  },
  {
    id: 'house-5',
    zillowUrl: 'https://www.zillow.com/homedetails/555-birch-court',
    address: '555 Birch Court',
    city: 'Austin',
    state: 'TX',
    zipCode: '78745',
    price: 725000,
    bedrooms: 5,
    bathrooms: 3.5,
    sqft: 3100,
    yearBuilt: 2021,
    images: [
      'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=800',
      'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800',
      'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800',
    ],
    description: 'Stunning luxury home with high-end finishes throughout. Features include a theater room, wine cellar, and resort-style backyard.',
    features: ['Theater room', 'Wine cellar', 'Pool & spa', 'Outdoor kitchen', '3-car garage'],
    addedBy: 'client',
    addedAt: new Date('2024-01-22'),
  },
  {
    id: 'house-6',
    zillowUrl: 'https://www.zillow.com/homedetails/888-willow-way',
    address: '888 Willow Way',
    city: 'Pflugerville',
    state: 'TX',
    zipCode: '78660',
    price: 365000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    yearBuilt: 2016,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      'https://images.unsplash.com/photo-1600566752229-250ed79470f8?w=800',
      'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800',
    ],
    description: 'Perfect starter home or investment property. Well-maintained with a functional layout, nice backyard, and low HOA fees.',
    features: ['Low HOA', 'Well-maintained', 'Community pool', 'Near shopping', 'Good schools'],
    addedBy: 'realtor',
    addedAt: new Date('2024-01-25'),
  },
];

export const mockScheduledVisits: ScheduledVisit[] = [
  {
    id: 'visit-1',
    houseId: 'house-1',
    date: new Date('2024-02-10'),
    time: '10:00 AM',
    status: 'completed',
  },
  {
    id: 'visit-2',
    houseId: 'house-2',
    date: new Date('2024-02-10'),
    time: '11:30 AM',
    status: 'completed',
  },
  {
    id: 'visit-3',
    houseId: 'house-3',
    date: new Date('2024-02-12'),
    time: '2:00 PM',
    status: 'scheduled',
  },
  {
    id: 'visit-4',
    houseId: 'house-4',
    date: new Date('2024-02-12'),
    time: '3:30 PM',
    status: 'scheduled',
  },
  {
    id: 'visit-5',
    houseId: 'house-5',
    date: new Date('2024-02-15'),
    time: '10:00 AM',
    status: 'scheduled',
  },
];

export const mockHouseVisits: HouseVisit[] = [
  {
    id: 'hvisit-1',
    houseId: 'house-1',
    visitedAt: new Date('2024-02-10T10:00:00'),
    recordings: [
      {
        id: 'rec-1',
        houseId: 'house-1',
        roomId: 'living',
        audioUrl: '',
        duration: 45,
        recordedAt: new Date('2024-02-10T10:05:00'),
      },
      {
        id: 'rec-2',
        houseId: 'house-1',
        roomId: 'kitchen',
        audioUrl: '',
        duration: 62,
        recordedAt: new Date('2024-02-10T10:10:00'),
      },
      {
        id: 'rec-3',
        houseId: 'house-1',
        roomId: 'master',
        audioUrl: '',
        duration: 38,
        recordedAt: new Date('2024-02-10T10:15:00'),
      },
      {
        id: 'rec-4',
        houseId: 'house-1',
        roomId: 'backyard',
        audioUrl: '',
        duration: 28,
        recordedAt: new Date('2024-02-10T10:20:00'),
      },
    ],
    overallImpression: 'liked',
    wouldBuy: true,
    notes: 'Great location, loved the kitchen. Backyard is a bit small.',
  },
  {
    id: 'hvisit-2',
    houseId: 'house-2',
    visitedAt: new Date('2024-02-10T11:30:00'),
    recordings: [
      {
        id: 'rec-5',
        houseId: 'house-2',
        roomId: 'living',
        audioUrl: '',
        duration: 55,
        recordedAt: new Date('2024-02-10T11:35:00'),
      },
      {
        id: 'rec-6',
        houseId: 'house-2',
        roomId: 'kitchen',
        audioUrl: '',
        duration: 72,
        recordedAt: new Date('2024-02-10T11:42:00'),
      },
      {
        id: 'rec-7',
        houseId: 'house-2',
        roomId: 'master',
        audioUrl: '',
        duration: 48,
        recordedAt: new Date('2024-02-10T11:50:00'),
      },
      {
        id: 'rec-8',
        houseId: 'house-2',
        roomId: 'backyard',
        audioUrl: '',
        duration: 65,
        recordedAt: new Date('2024-02-10T11:58:00'),
      },
      {
        id: 'rec-9',
        houseId: 'house-2',
        roomId: 'general',
        audioUrl: '',
        duration: 42,
        recordedAt: new Date('2024-02-10T12:05:00'),
      },
    ],
    overallImpression: 'loved',
    wouldBuy: true,
    notes: 'This is the one! Amazing pool and backyard. Kitchen is perfect.',
  },
];

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getHouseById(id: string): House | undefined {
  return mockHouses.find(h => h.id === id);
}

export function getVisitByHouseId(houseId: string): HouseVisit | undefined {
  return mockHouseVisits.find(v => v.houseId === houseId);
}

export function getScheduledVisitsForHouse(houseId: string): ScheduledVisit[] {
  return mockScheduledVisits.filter(v => v.houseId === houseId);
}
