"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { NEW_CASE_TRANSCRIPTION_MAX_DURATION_SECONDS } from "@/lib/constants"

type RecorderState = "idle" | "recording" | "paused"

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)

  const [state, setState] = useState<RecorderState>("idle")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [waveformBars, setWaveformBars] = useState<number[]>(
    Array.from({ length: 10 }, () => 8),
  )

  const clearAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const startAnalyserLoop = useCallback(() => {
    const analyser = analyserRef.current
    const data = frequencyDataRef.current
    if (!analyser || !data) return

    const tick = () => {
      analyser.getByteFrequencyData(data)
      const buckets = 10
      const bucketSize = Math.max(1, Math.floor(data.length / buckets))
      const bars = Array.from({ length: buckets }, (_, index) => {
        const start = index * bucketSize
        const slice = data.slice(start, start + bucketSize)
        const sum = slice.reduce((accumulator, value) => accumulator + value, 0)
        const avg = slice.length ? sum / slice.length : 0
        return Math.max(4, Math.min(16, Math.round((avg / 255) * 16)))
      })
      setWaveformBars(bars)
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    tick()
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopTracks = useCallback(() => {
    if (!streamRef.current) return
    streamRef.current.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const teardownAnalyser = useCallback(() => {
    clearAnimation()
    analyserRef.current = null
    frequencyDataRef.current = null
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    setWaveformBars(Array.from({ length: 10 }, () => 8))
  }, [clearAnimation])

  const reset = useCallback(() => {
    clearTimer()
    stopTracks()
    teardownAnalyser()
    mediaRecorderRef.current = null
    chunksRef.current = []
    setState("idle")
    setElapsedSeconds(0)
    setError(null)
  }, [clearTimer, stopTracks, teardownAnalyser])

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)
      analyserRef.current = analyser
      frequencyDataRef.current = new Uint8Array(
        new ArrayBuffer(analyser.frequencyBinCount),
      )

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : ""
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      setElapsedSeconds(0)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.start(1000)
      setState("recording")
      startAnalyserLoop()
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((value) => {
          if (value >= NEW_CASE_TRANSCRIPTION_MAX_DURATION_SECONDS) {
            return value
          }
          return value + 1
        })
      }, 1000)
    } catch {
      setError("Não foi possível acessar o microfone.")
      reset()
    }
  }, [reset, startAnalyserLoop])

  const pause = useCallback(() => {
    if (!mediaRecorderRef.current || state !== "recording") return
    mediaRecorderRef.current.pause()
    setState("paused")
    clearTimer()
    clearAnimation()
  }, [clearAnimation, clearTimer, state])

  const resume = useCallback(() => {
    if (!mediaRecorderRef.current || state !== "paused") return
    mediaRecorderRef.current.resume()
    setState("recording")
    startAnalyserLoop()
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1)
    }, 1000)
  }, [startAnalyserLoop, state])

  const cancel = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    reset()
  }, [reset])

  const finalize = useCallback(async (): Promise<File | null> => {
    const recorder = mediaRecorderRef.current
    if (!recorder) return null

    return new Promise((resolve) => {
      recorder.onstop = () => {
        clearTimer()
        stopTracks()
        teardownAnalyser()
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        const file = new File([blob], `novo-caso-${Date.now()}.webm`, {
          type: recorder.mimeType || "audio/webm",
        })
        mediaRecorderRef.current = null
        chunksRef.current = []
        setState("idle")
        setElapsedSeconds(0)
        resolve(file)
      }

      if (recorder.state !== "inactive") {
        recorder.stop()
      } else {
        resolve(null)
      }
    })
  }, [clearTimer, stopTracks, teardownAnalyser])

  useEffect(() => {
    if (elapsedSeconds < NEW_CASE_TRANSCRIPTION_MAX_DURATION_SECONDS) return
    void finalize()
  }, [elapsedSeconds, finalize])

  useEffect(() => () => reset(), [reset])

  return {
    state,
    elapsedSeconds,
    error,
    waveformBars,
    start,
    pause,
    resume,
    cancel,
    finalize,
    isRecording: state === "recording",
    isPaused: state === "paused",
  }
}

