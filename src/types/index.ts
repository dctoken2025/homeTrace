export interface House {
  id: string;
  zillowUrl: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  yearBuilt: number;
  images: string[];
  description: string;
  features: string[];
  addedBy: 'realtor' | 'client';
  addedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  icon: string;
}

export const DEFAULT_ROOMS: Room[] = [
  { id: 'living', name: 'Living Room', icon: '🛋️' },
  { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { id: 'master', name: 'Master Bedroom', icon: '🛏️' },
  { id: 'bedroom2', name: 'Bedroom 2', icon: '🛏️' },
  { id: 'bedroom3', name: 'Bedroom 3', icon: '🛏️' },
  { id: 'bathroom1', name: 'Bathroom 1', icon: '🚿' },
  { id: 'bathroom2', name: 'Bathroom 2', icon: '🚿' },
  { id: 'garage', name: 'Garage', icon: '🚗' },
  { id: 'backyard', name: 'Backyard', icon: '🌳' },
  { id: 'frontyard', name: 'Front Yard', icon: '🏡' },
  { id: 'general', name: 'General Impression', icon: '💭' },
];

export interface AudioRecording {
  id: string;
  houseId: string;
  roomId: string;
  audioUrl: string;
  duration: number;
  recordedAt: Date;
  transcript?: string;
}

export interface HouseVisit {
  id: string;
  houseId: string;
  visitedAt: Date;
  recordings: AudioRecording[];
  overallImpression?: 'loved' | 'liked' | 'neutral' | 'disliked';
  wouldBuy: boolean | null;
  notes?: string;
}

export interface ScheduledVisit {
  id: string;
  houseId: string;
  date: Date;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export type ImpressionEmoji = {
  [key in 'loved' | 'liked' | 'neutral' | 'disliked']: string;
};

export const IMPRESSION_EMOJIS: ImpressionEmoji = {
  loved: '😍',
  liked: '🙂',
  neutral: '😐',
  disliked: '😕',
};
