'use client';

import { AudioRecording, DEFAULT_ROOMS } from '@/types';
import AudioPlayer from './AudioPlayer';
import { formatDuration } from '@/data/mock';

interface AudioTimelineProps {
  recordings: AudioRecording[];
  onDelete?: (recordingId: string) => void;
  groupByRoom?: boolean;
}

export default function AudioTimeline({ recordings, onDelete, groupByRoom = true }: AudioTimelineProps) {
  const getRoomName = (roomId: string) => {
    return DEFAULT_ROOMS.find(r => r.id === roomId)?.name || roomId;
  };

  const getRoomIcon = (roomId: string) => {
    return DEFAULT_ROOMS.find(r => r.id === roomId)?.icon || '📍';
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p>No recordings yet</p>
      </div>
    );
  }

  if (groupByRoom) {
    const groupedRecordings = recordings.reduce((acc, recording) => {
      if (!acc[recording.roomId]) {
        acc[recording.roomId] = [];
      }
      acc[recording.roomId].push(recording);
      return acc;
    }, {} as Record<string, AudioRecording[]>);

    return (
      <div className="space-y-4">
        {Object.entries(groupedRecordings).map(([roomId, roomRecordings]) => (
          <div key={roomId} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{getRoomIcon(roomId)}</span>
              <h4 className="font-medium text-gray-900">{getRoomName(roomId)}</h4>
              <span className="text-xs text-gray-500">({roomRecordings.length} recordings)</span>
            </div>
            <div className="space-y-2">
              {roomRecordings.map((recording) => (
                <div key={recording.id} className="flex items-center justify-between">
                  <div className="flex-1 mr-3">
                    {recording.audioUrl ? (
                      <AudioPlayer audioUrl={recording.audioUrl} duration={recording.duration} compact />
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                        </svg>
                        <span className="text-sm">{formatDuration(recording.duration)}</span>
                      </div>
                    )}
                  </div>
                  {onDelete && (
                    <button
                      onClick={() => onDelete(recording.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {recordings.map((recording) => (
        <div key={recording.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <span className="text-xl">{getRoomIcon(recording.roomId)}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{getRoomName(recording.roomId)}</p>
            {recording.audioUrl ? (
              <AudioPlayer audioUrl={recording.audioUrl} duration={recording.duration} compact />
            ) : (
              <p className="text-xs text-gray-500">{formatDuration(recording.duration)}</p>
            )}
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(recording.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
