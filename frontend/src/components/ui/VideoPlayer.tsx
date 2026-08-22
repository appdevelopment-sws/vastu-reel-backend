import React, { useEffect, useRef, useState } from "react"
import Hls from "hls.js"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Loader2,
  AlertCircle,
} from "lucide-react"

export interface VideoPlayerProps {
  src: string | null | undefined
  poster?: string | null
  autoPlay?: boolean
  loop?: boolean
  className?: string
  aspectRatio?: "9/16" | "16/9" | "auto"
  onEnded?: () => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  autoPlay = true,
  loop = true,
  className = "",
  aspectRatio = "9/16",
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const [currentQuality, setCurrentQuality] = useState<string>("Auto")

  const hideTimeoutRef = useRef<any>(null)

  // Initialize and load video stream (HLS or Native MP4)
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) {
      if (!src) {
        setHasError("No video source provided")
        setIsLoading(false)
      }
      return
    }

    setHasError(null)
    setIsLoading(true)
    setCurrentTime(0)

    // Destroy any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const isHlsSource = src.includes(".m3u8")

    if (isHlsSource && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      })
      hlsRef.current = hls

      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(() => {
            // Autoplay with sound might be blocked, mute and retry
            video.muted = true
            setIsMuted(true)
            video.play().catch((err) => console.warn("Autoplay blocked:", err))
          })
        }
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls.levels[data.level]) {
          const lvl = hls.levels[data.level]
          setCurrentQuality(`${lvl.height || lvl.width}p`)
        }
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn("HLS fatal network error, recovering...", data)
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn("HLS fatal media error, recovering...", data)
              hls.recoverMediaError()
              break
            default:
              console.error("HLS unrecoverable error:", data)
              hls.destroy()
              setHasError("Failed to load video stream.")
              setIsLoading(false)
              break
          }
        }
      })
    } else if (
      video.canPlayType("application/vnd.apple.mpegurl") ||
      !isHlsSource
    ) {
      // Native HLS support (Safari) or standard mp4/webm
      video.src = src
      const onLoadedMetadata = () => {
        setIsLoading(false)
        if (autoPlay) {
          video.play().catch(() => {
            video.muted = true
            setIsMuted(true)
            video.play().catch((err) => console.warn("Autoplay blocked:", err))
          })
        }
      }

      video.addEventListener("loadedmetadata", onLoadedMetadata)
      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata)
      }
    } else {
      setHasError("Browser does not support HLS streaming.")
      setIsLoading(false)
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, autoPlay])

  // Track progress and buffering
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (video.duration) {
      setDuration(video.duration)
    }

    // Buffered range
    if (video.buffered.length > 0 && video.duration > 0) {
      const buffEnd = video.buffered.end(video.buffered.length - 1)
      setBuffered((buffEnd / video.duration) * 100)
    }
  }

  const handleTogglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch((e) => console.warn("Play error:", e))
    } else {
      video.pause()
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video || !duration) return
    const target = parseFloat(e.target.value)
    video.currentTime = target
    setCurrentTime(target)
  }

  const handleToggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
    if (!video.muted && video.volume === 0) {
      video.volume = 0.8
      setVolume(0.8)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const newVol = parseFloat(e.target.value)
    video.volume = newVol
    setVolume(newVol)
    if (newVol === 0) {
      video.muted = true
      setIsMuted(true)
    } else if (video.muted) {
      video.muted = false
      setIsMuted(false)
    }
  }

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setPlaybackRate(rate)
    setShowSpeedMenu(false)
  }

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.warn("Fullscreen error:", err))
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.warn("Exit fullscreen error:", err))
    }
  }

  // Auto-hide controls during playback
  const handleMouseMove = () => {
    setShowControls(true)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        setShowSpeedMenu(false)
      }, 2500)
    }
  }

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const aspectClass =
    aspectRatio === "9/16"
      ? "aspect-[9/16]"
      : aspectRatio === "16/9"
        ? "aspect-video"
        : "h-full w-full"

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className={`group relative flex items-center justify-center overflow-hidden rounded-2xl bg-black select-none ${aspectClass} ${className}`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        poster={poster || undefined}
        loop={loop}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false)
          onEnded?.()
        }}
        onClick={handleTogglePlay}
        className="h-full w-full object-contain cursor-pointer"
      />

      {/* Loading Spinner Overlay */}
      {isLoading && !hasError && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <span className="mt-2 text-xs font-medium text-white/90">
            Streaming Video...
          </span>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 text-center text-white">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-500" />
          <p className="text-sm font-semibold">{hasError}</p>
          <p className="mt-1 text-xs text-white/60">
            Check if backend storage & video stream are available.
          </p>
          <button
            onClick={() => {
              if (videoRef.current && src) {
                setHasError(null)
                setIsLoading(true)
                videoRef.current.load()
              }
            }}
            className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Playback</span>
          </button>
        </div>
      )}

      {/* Big Center Play / Pause Click Indicator (when paused) */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={handleTogglePlay}
          className="absolute z-10 flex h-16 w-16 items-center justify-center rounded-full bg-black/60 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-110 hover:bg-primary"
        >
          <Play className="ml-1 h-8 w-8 fill-current" />
        </button>
      )}

      {/* Quality Badge on Top Left */}
      {currentQuality && (
        <div className="absolute top-3 left-3 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-md">
          {currentQuality}
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-all duration-300 ${
          showControls || !isPlaying
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        {/* Seek Progress Bar */}
        <div className="relative mb-2 flex items-center">
          {/* Buffered track */}
          <div
            className="absolute h-1 rounded-full bg-white/20"
            style={{ width: `${buffered}%` }}
          />
          {/* Progress track */}
          <div
            className="absolute h-1 rounded-full bg-primary"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          />
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="relative h-1 w-full cursor-pointer appearance-none rounded-full bg-transparent accent-primary opacity-0 transition hover:opacity-100 focus:opacity-100"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <button
              onClick={handleTogglePlay}
              className="rounded-lg p-1.5 transition hover:bg-white/20"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </button>

            {/* Volume / Mute */}
            <div className="flex items-center gap-1.5 group/vol">
              <button
                onClick={handleToggleMute}
                className="rounded-lg p-1.5 transition hover:bg-white/20"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4 text-rose-400" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="h-1 w-14 cursor-pointer appearance-none rounded-full bg-white/30 accent-primary"
              />
            </div>

            {/* Time Stamp */}
            <span className="text-[11px] font-medium text-white/80 tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Playback Speed Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold text-white/90 transition hover:bg-white/20"
                title="Playback Speed"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute right-0 bottom-full mb-2 flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/90 p-1 text-xs text-white shadow-xl backdrop-blur-md">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`rounded-lg px-3 py-1.5 text-left text-xs transition ${
                        playbackRate === rate
                          ? "bg-primary font-bold text-primary-foreground"
                          : "hover:bg-white/10"
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={handleToggleFullscreen}
              className="rounded-lg p-1.5 transition hover:bg-white/20"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
