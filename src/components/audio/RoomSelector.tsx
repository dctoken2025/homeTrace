'use client';

import { DEFAULT_ROOMS, Room, AudioRecording } from '@/types';

interface RoomSelectorProps {
  selectedRoom: string;
  onSelectRoom: (roomId: string) => void;
  recordings: AudioRecording[];
  rooms?: Room[];
}

export default function RoomSelector({
  selectedRoom,
  onSelectRoom,
  recordings,
  rooms = DEFAULT_ROOMS,
}: RoomSelectorProps) {
  const getRecordingCount = (roomId: string) => {
    return recordings.filter(r => r.roomId === roomId).length;
  };

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {rooms.map((room) => {
        const count = getRecordingCount(room.id);
        const isSelected = selectedRoom === room.id;

        return (
          <button
            key={room.id}
            onClick={() => onSelectRoom(room.id)}
            className={`relative p-3 rounded-xl transition-all ${
              isSelected
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="text-2xl mb-1">{room.icon}</div>
            <p className="text-xs font-medium text-gray-700 truncate">{room.name}</p>

            {count > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
