'use client';

import { use, useState, useCallback } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AudioRecorder from '@/components/audio/AudioRecorder';
import RoomSelector from '@/components/audio/RoomSelector';
import AudioTimeline from '@/components/audio/AudioTimeline';
import { getHouseById, getVisitByHouseId, formatDuration } from '@/data/mock';
import { AudioRecording, DEFAULT_ROOMS, IMPRESSION_EMOJIS } from '@/types';

interface VisitPageProps {
  params: Promise<{ id: string }>;
}

export default function VisitPage({ params }: VisitPageProps) {
  const { id } = use(params);
  const house = getHouseById(id);
  const existingVisit = getVisitByHouseId(id);

  const [selectedRoom, setSelectedRoom] = useState('living');
  const [recordings, setRecordings] = useState<AudioRecording[]>(existingVisit?.recordings || []);
  const [impression, setImpression] = useState<'loved' | 'liked' | 'neutral' | 'disliked' | null>(
    existingVisit?.overallImpression || null
  );

  if (!house) {
    notFound();
  }

  const handleRecordingComplete = useCallback((blob: Blob, duration: number) => {
    const newRecording: AudioRecording = {
      id: `rec-${Date.now()}`,
      houseId: house.id,
      roomId: selectedRoom,
      audioUrl: URL.createObjectURL(blob),
      duration,
      recordedAt: new Date(),
    };

    setRecordings((prev) => [...prev, newRecording]);
  }, [house.id, selectedRoom]);

  const handleDeleteRecording = useCallback((recordingId: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
  }, []);

  const currentRoomRecordings = recordings.filter((r) => r.roomId === selectedRoom);
  const selectedRoomName = DEFAULT_ROOMS.find((r) => r.id === selectedRoom)?.name || selectedRoom;

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/client/house/${house.id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{house.address}</h1>
          <p className="text-sm text-gray-500">{house.city}, {house.state}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Recordings</p>
          <p className="text-2xl font-bold text-blue-600">{recordings.length}</p>
        </div>
      </div>

      {/* Room Selector */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Select Room</h2>
        <RoomSelector
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
          recordings={recordings}
        />
      </Card>

      {/* Recording Section */}
      <Card className="mb-6">
        <div className="text-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{selectedRoomName}</h2>
          <p className="text-sm text-gray-500">
            {currentRoomRecordings.length} recording{currentRoomRecordings.length !== 1 ? 's' : ''}
          </p>
        </div>

        <AudioRecorder onRecordingComplete={handleRecordingComplete} />

        {/* Room Recordings */}
        {currentRoomRecordings.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Recordings in this room</h3>
            <div className="space-y-2">
              {currentRoomRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDuration(recording.duration)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {recording.recordedAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRecording(recording.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Overall Impression */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Overall Impression</h2>
        <div className="flex justify-center gap-4">
          {(['loved', 'liked', 'neutral', 'disliked'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setImpression(option)}
              className={`p-3 rounded-xl transition-all ${
                impression === option
                  ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <span className="text-3xl">{IMPRESSION_EMOJIS[option]}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Finish Button */}
      <Link href={`/client/house/${house.id}`}>
        <Button size="lg" className="w-full">
          Finish Visit
        </Button>
      </Link>

      {/* All Recordings Summary */}
      {recordings.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">All Recordings</h2>
          <AudioTimeline recordings={recordings} onDelete={handleDeleteRecording} />
        </Card>
      )}
    </div>
  );
}
