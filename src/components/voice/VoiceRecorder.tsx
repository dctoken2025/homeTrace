'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface VoiceRecorderProps {
  onRecordingComplete: (transcription: string, duration: number) => void
  onTranscriptionUpdate?: (text: string) => void
  onRecordingStart?: () => void
  onRecordingStop?: () => void
  maxDuration?: number // in seconds
  disabled?: boolean
}

export interface RecordingState {
  isRecording: boolean
  isPaused: boolean
  duration: number
  audioLevel: number
  transcription: string
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: SpeechRecognitionEvent) => void
  onerror: (event: SpeechRecognitionErrorEvent) => void
  onend: () => void
  onstart: () => void
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export default function VoiceRecorder({
  onRecordingComplete,
  onTranscriptionUpdate,
  onRecordingStart,
  onRecordingStop,
  maxDuration = 300, // 5 minutes default
  disabled = false,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    transcription: '',
  })
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [browserSupported, setBrowserSupported] = useState(true)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animationRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const transcriptionRef = useRef<string>('')
  const isStoppingRef = useRef<boolean>(false)

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setBrowserSupported(false)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Analyze audio levels for visualization
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !state.isRecording) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
    const normalizedLevel = Math.min(average / 128, 1) // Normalize to 0-1

    setState(prev => ({ ...prev, audioLevel: normalizedLevel }))

    if (state.isRecording) {
      animationRef.current = requestAnimationFrame(analyzeAudio)
    }
  }, [state.isRecording])

  const startRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setBrowserSupported(false)
      return
    }

    try {
      // Request microphone access for audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      })

      streamRef.current = stream
      setPermissionDenied(false)
      isStoppingRef.current = false

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256

      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      // Set up speech recognition
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US' // Can be changed to 'pt-BR' for Portuguese

      recognitionRef.current = recognition
      transcriptionRef.current = ''

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = ''
        let interimTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        // Debug log
        console.log('[VoiceRecorder] Speech result:', {
          finalTranscript: finalTranscript || '(none)',
          interimTranscript: interimTranscript || '(none)',
          totalLength: transcriptionRef.current.length,
        })

        if (finalTranscript) {
          transcriptionRef.current += finalTranscript
        }

        const fullText = transcriptionRef.current + interimTranscript
        setState(prev => ({ ...prev, transcription: fullText }))
        onTranscriptionUpdate?.(fullText)
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[VoiceRecorder] Speech recognition error:', {
          error: event.error,
          message: event.message,
          currentTranscription: transcriptionRef.current,
        })
        if (event.error === 'not-allowed') {
          setPermissionDenied(true)
        }
        // Log other common errors
        if (event.error === 'no-speech') {
          console.warn('[VoiceRecorder] No speech detected - user may not be speaking or mic issue')
        }
        if (event.error === 'audio-capture') {
          console.warn('[VoiceRecorder] Audio capture failed - microphone may be in use by another app')
        }
        if (event.error === 'network') {
          console.warn('[VoiceRecorder] Network error - speech recognition requires internet')
        }
      }

      recognition.onend = () => {
        // Restart recognition if still recording (it auto-stops after silence)
        if (state.isRecording && !isStoppingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            // Already started, ignore
          }
        }
      }

      recognition.start()

      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newDuration = prev.duration + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return { ...prev, duration: newDuration }
        })
      }, 1000)

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioLevel: 0,
        transcription: '',
      })

      onRecordingStart?.()
      analyzeAudio()

    } catch (err) {
      console.error('Failed to start recording:', err)
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionDenied(true)
      }
    }
  }

  const stopRecording = useCallback(() => {
    isStoppingRef.current = true

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Return the final transcription
    const finalTranscription = transcriptionRef.current.trim()
    const finalDuration = state.duration

    // Debug log
    console.log('[VoiceRecorder] Recording stopped:', {
      transcriptionLength: finalTranscription.length,
      duration: finalDuration,
      transcription: finalTranscription || '(empty)',
    })

    setState(prev => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      audioLevel: 0,
    }))

    // Always call onRecordingComplete, even with empty transcription
    // Let the parent component decide how to handle it
    onRecordingComplete(finalTranscription, finalDuration)
    onRecordingStop?.()
  }, [state.duration, onRecordingComplete, onRecordingStop])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Browser not supported
  if (!browserSupported) {
    return (
      <div className="text-center p-6 bg-amber-50 rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-amber-800 mb-2">Browser Not Supported</h3>
        <p className="text-amber-600 text-sm mb-4">
          Voice recording requires Chrome, Edge, or Safari. Please use one of these browsers.
        </p>
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-xl">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 mb-2">Microphone Access Required</h3>
        <p className="text-red-600 text-sm mb-4">
          Please allow microphone access in your browser settings to use voice recording.
        </p>
        <button
          onClick={startRecording}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      {/* Live Transcription */}
      {state.isRecording && state.transcription && (
        <div className="w-full mb-6 p-4 bg-gray-50 rounded-xl max-h-32 overflow-y-auto">
          <p className="text-sm text-gray-600 italic">"{state.transcription}"</p>
        </div>
      )}

      {/* Audio Level Visualization */}
      {state.isRecording && (
        <div className="flex items-center justify-center gap-1 h-16 mb-6">
          {[...Array(12)].map((_, i) => {
            const barHeight = Math.max(
              8,
              Math.min(64, 8 + state.audioLevel * 56 * Math.sin((i / 11) * Math.PI))
            )
            return (
              <div
                key={i}
                className="w-2 bg-[#006AFF] rounded-full transition-all duration-75"
                style={{
                  height: `${barHeight}px`,
                  opacity: 0.4 + state.audioLevel * 0.6,
                }}
              />
            )
          })}
        </div>
      )}

      {/* Timer */}
      {state.isRecording && (
        <div className="mb-6 text-center">
          <span className="text-3xl font-mono font-bold text-gray-800">
            {formatTime(state.duration)}
          </span>
          <p className="text-sm text-gray-500 mt-1">
            Recording & Transcribing...
          </p>
        </div>
      )}

      {/* Main Record Button */}
      <div className="relative">
        {state.isRecording && (
          <div className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
        )}
        <button
          onClick={state.isRecording ? stopRecording : startRecording}
          disabled={disabled}
          className={`
            relative w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 transform hover:scale-105 active:scale-95
            focus:outline-none focus:ring-4 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
            ${state.isRecording
              ? 'bg-red-500 hover:bg-red-600 focus:ring-red-300'
              : 'bg-[#006AFF] hover:bg-[#0052CC] focus:ring-blue-300'
            }
          `}
        >
          {state.isRecording ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {/* Instructions */}
      {!state.isRecording && (
        <p className="mt-4 text-sm text-gray-500 text-center">
          Tap to start recording
        </p>
      )}

      {/* Max duration indicator */}
      {state.isRecording && (
        <div className="mt-4 w-full max-w-xs">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#006AFF] transition-all duration-1000"
              style={{ width: `${(state.duration / maxDuration) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">
            {formatTime(maxDuration - state.duration)} remaining
          </p>
        </div>
      )}

      {/* Transcription hint */}
      {state.isRecording && !state.transcription && state.duration > 2 && (
        <p className="mt-4 text-xs text-amber-600 text-center">
          Start speaking... your words will appear here
        </p>
      )}
    </div>
  )
}
