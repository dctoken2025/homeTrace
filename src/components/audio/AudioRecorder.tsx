'use client';

import { useEffect } from 'react';
import useAudioRecorder from '@/hooks/useAudioRecorder';
import { formatDuration } from '@/data/mock';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
}

export default function AudioRecorder({ onRecordingComplete, onRecordingStart }: AudioRecorderProps) {
  const {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  } = useAudioRecorder();

  const handleToggleRecording = async () => {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob) {
        onRecordingComplete(blob, duration);
      }
    } else {
      onRecordingStart?.();
      await startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Main Record Button */}
      <button
        onClick={handleToggleRecording}
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all transform active:scale-95 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isRecording ? (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* Duration */}
      <div className="mt-4 text-center">
        {isRecording ? (
          <>
            <p className="text-2xl font-mono font-bold text-red-600">
              {formatDuration(duration)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Recording...</p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Tap to start recording</p>
        )}
      </div>

      {/* Cancel Button */}
      {isRecording && (
        <button
          onClick={cancelRecording}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
