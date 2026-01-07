'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AudioRecorder from '@/components/audio/AudioRecorder';
import RoomSelector from '@/components/audio/RoomSelector';
import AudioTimeline from '@/components/audio/AudioTimeline';
import { useToast } from '@/components/ui/Toast';
import { DEFAULT_ROOMS, IMPRESSION_EMOJIS } from '@/types';

interface VisitPageProps {
  params: Promise<{ id: string }>;
}

interface RecordingData {
  id: string;
  roomId: string;
  roomName: string;
  audioUrl: string | null;
  audioDuration: number | null;
  status: string;
  createdAt: string;
}

interface VisitData {
  id: string;
  houseId: string;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  overallImpression: string | null;
  wouldBuy: boolean | null;
  notes: string | null;
  house: {
    id: string;
    address: string;
    city: string;
    state: string;
    price: number | null;
    images: string[];
  };
}

// Helper to format duration
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function VisitPage({ params }: VisitPageProps) {
  const { id: houseId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitId = searchParams.get('visitId');
  const { success, error: showError, warning } = useToast();

  const [visit, setVisit] = useState<VisitData | null>(null);
  const [recordings, setRecordings] = useState<RecordingData[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('living');
  const [impression, setImpression] = useState<'LOVED' | 'LIKED' | 'NEUTRAL' | 'DISLIKED' | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Fetch visit data
  useEffect(() => {
    async function fetchData() {
      if (!visitId) {
        showError('Error', 'No visit ID provided');
        router.push(`/client/houses/${houseId}`);
        return;
      }

      try {
        setLoading(true);

        // Fetch visit details
        const visitRes = await fetch(`/api/visits/${visitId}`);
        const visitData = await visitRes.json();

        if (!visitRes.ok) {
          throw new Error(visitData.error?.message || 'Failed to load visit');
        }

        setVisit(visitData.data);
        if (visitData.data.overallImpression) {
          setImpression(visitData.data.overallImpression);
        }

        // Fetch recordings for this visit
        const recRes = await fetch(`/api/recordings?visitId=${visitId}`);
        const recData = await recRes.json();

        if (recRes.ok && recData.data) {
          setRecordings(recData.data.map((r: any) => ({
            id: r.id,
            roomId: r.roomId,
            roomName: r.roomName,
            audioUrl: r.audioUrl,
            audioDuration: r.audioDuration,
            status: r.status,
            createdAt: r.createdAt,
          })));
        }
      } catch (err) {
        showError('Error', err instanceof Error ? err.message : 'Failed to load visit');
        router.push(`/client/houses/${houseId}`);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [visitId, houseId, router, showError]);

  // Handle recording complete
  const handleRecordingComplete = useCallback(async (blob: Blob, duration: number) => {
    if (!visitId) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob);
      formData.append('visitId', visitId);
      formData.append('roomId', selectedRoom);
      formData.append('roomName', DEFAULT_ROOMS.find(r => r.id === selectedRoom)?.name || selectedRoom);
      formData.append('audioDuration', duration.toString());

      const response = await fetch('/api/recordings', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to save recording');
      }

      const newRecording: RecordingData = {
        id: data.data.recording.id,
        roomId: data.data.recording.roomId,
        roomName: data.data.recording.roomName,
        audioUrl: data.data.recording.audioUrl,
        audioDuration: data.data.recording.audioDuration,
        status: data.data.recording.status,
        createdAt: data.data.recording.createdAt,
      };

      setRecordings(prev => [...prev, newRecording]);
      success('Recording Saved', `Recording saved for ${newRecording.roomName}`);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to save recording');
    } finally {
      setUploading(false);
    }
  }, [visitId, selectedRoom, success, showError]);

  // Handle delete recording
  const handleDeleteRecording = useCallback(async (recordingId: string) => {
    try {
      const response = await fetch(`/api/recordings/${recordingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to delete recording');
      }

      setRecordings(prev => prev.filter(r => r.id !== recordingId));
      success('Deleted', 'Recording deleted');
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to delete recording');
    }
  }, [success, showError]);

  // Handle complete visit
  const handleCompleteVisit = async () => {
    if (!visitId) return;

    if (!impression) {
      warning('Select Impression', 'Please select your overall impression before finishing');
      return;
    }

    setCompleting(true);

    try {
      const response = await fetch(`/api/visits/${visitId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallImpression: impression,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to complete visit');
      }

      success('Visit Completed', 'Your visit has been completed!');
      router.push(`/client/houses/${houseId}`);
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'Failed to complete visit');
    } finally {
      setCompleting(false);
    }
  };

  // Transform recordings for AudioTimeline
  const timelineRecordings = recordings.map(r => ({
    id: r.id,
    houseId: visit?.houseId || houseId,
    roomId: r.roomId,
    audioUrl: r.audioUrl || '',
    duration: r.audioDuration || 0,
    recordedAt: new Date(r.createdAt),
  }));

  const currentRoomRecordings = recordings.filter(r => r.roomId === selectedRoom);
  const selectedRoomName = DEFAULT_ROOMS.find(r => r.id === selectedRoom)?.name || selectedRoom;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pb-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!visit) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/client/houses/${houseId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{visit.house.address}</h1>
          <p className="text-sm text-gray-500">{visit.house.city}, {visit.house.state}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Recordings</p>
          <p className="text-2xl font-bold" style={{ color: '#006AFF' }}>{recordings.length}</p>
        </div>
      </div>

      {/* Status Banner */}
      {visit.status === 'SCHEDULED' && (
        <div className="rounded-lg p-4 mb-6" style={{ background: '#E3F2FD', borderWidth: '1px', borderStyle: 'solid', borderColor: '#BBDEFB' }}>
          <p className="text-sm" style={{ color: '#1565C0' }}>
            This visit is scheduled. Start recording your impressions of each room.
          </p>
        </div>
      )}

      {/* Room Selector */}
      <Card className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Select Room</h2>
        <RoomSelector
          selectedRoom={selectedRoom}
          onSelectRoom={setSelectedRoom}
          recordings={timelineRecordings}
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

        {uploading ? (
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: '#006AFF' }} />
            <p className="text-gray-600">Saving recording...</p>
          </div>
        ) : (
          <AudioRecorder onRecordingComplete={handleRecordingComplete} />
        )}

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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#E3F2FD' }}>
                      <svg className="w-4 h-4" style={{ color: '#006AFF' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {recording.audioDuration ? formatDuration(recording.audioDuration) : 'Processing...'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(recording.createdAt).toLocaleTimeString()}
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
          {(['LOVED', 'LIKED', 'NEUTRAL', 'DISLIKED'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setImpression(option)}
              className="p-3 rounded-xl transition-all"
              style={
                impression === option
                  ? { background: '#E3F2FD', boxShadow: '0 0 0 2px #006AFF', transform: 'scale(1.1)' }
                  : { background: '#F9FAFB' }
              }
            >
              <span className="text-3xl">{IMPRESSION_EMOJIS[option.toLowerCase() as keyof typeof IMPRESSION_EMOJIS]}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Finish Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={handleCompleteVisit}
        isLoading={completing}
        disabled={uploading}
      >
        {recordings.length === 0 ? 'Finish Without Recordings' : 'Finish Visit'}
      </Button>

      {/* All Recordings Summary */}
      {recordings.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">All Recordings</h2>
          <AudioTimeline recordings={timelineRecordings} onDelete={handleDeleteRecording} />
        </Card>
      )}
    </div>
  );
}
