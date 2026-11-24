import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Copy, Flame, Pause, Play, Radio, Volume2 } from 'lucide-react'
import { SOUNDBOARD_VAULT, SPORT_BADGE_META } from '../../data/mockPaddock'
import { safeHttpUrl } from '../../lib/safeUrl'
import { useF1Store } from '../../store/useF1Store'
import { useNewsStore } from '../../store/useNewsStore'

const hexColor = (c) => `#${String(c || '0D9488').replace(/^#/, '')}`

// Authentic F1 pit-wall push-to-talk radio bleep using Web Audio API
function playRadioChirp(freq = 540) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    const makeBeep = (startOffset, f, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, now + startOffset)
      gain.gain.setValueAtTime(0.08, now + startOffset)
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + startOffset)
      osc.stop(now + startOffset + dur)
    }

    makeBeep(0, freq, 0.07)
    makeBeep(0.09, freq * 1.25, 0.09)
    setTimeout(() => ctx.close().catch(() => {}), 400)
  } catch {
    /* ignore audio context restrictions */
  }
}

export default function RadioSoundboard({ sportFilter = 'all', searchQuery = '', compact = false }) {
  const telemetry = useF1Store((s) => s.telemetry)
  const fetchTelemetry = useF1Store((s) => s.fetchTelemetry)
  const radioHypes = useNewsStore((s) => s.radioHypes)
  const toggleRadioHype = useNewsStore((s) => s.toggleRadioHype)

  const [playingId, setPlayingId] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!telemetry) {
      fetchTelemetry()
    }
    return () => {
      clearTimeout(timerRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Merge live OpenF1 team radio MP3 clips with curated Paddock & Stump-Mic Vault
  const clips = useMemo(() => {
    const liveRadio = (telemetry?.teamRadio || []).slice(0, 4).map((tr, i) => ({
      id: `live-f1-${tr.id || i}`,
      sport: 'f1',
      speaker: tr.name || `Driver #${tr.num}`,
      acro: tr.acro || `#${tr.num}`,
      team: tr.team || telemetry?.meetingName || 'F1 Pit Wall',
      colour: tr.colour || '0D9488',
      context: `${telemetry?.meetingName || 'Grand Prix'} · Live Radio`,
      vibeTag: 'LIVE TELEMETRY 📡',
      quote: `Live pit-wall transmission from ${tr.name || tr.acro} during ${telemetry?.activeSession?.name || 'session'}.`,
      hypeCount: 310 + i * 47,
      url: tr.url,
      isLiveAudio: true,
      toneFreq: 560,
    }))

    const all = [...liveRadio, ...SOUNDBOARD_VAULT]
    const q = String(searchQuery || '').trim().toLowerCase()

    return all.filter((c) => {
      if (sportFilter !== 'all' && c.sport !== sportFilter) return false
      if (q) {
        const hay = `${c.speaker} ${c.team} ${c.quote} ${c.context} ${c.vibeTag}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [telemetry, sportFilter, searchQuery])

  const stopPlayback = () => {
    clearTimeout(timerRef.current)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setPlayingId(null)
  }

  const togglePlay = (clip) => {
    if (playingId === clip.id) {
      stopPlayback()
      return
    }

    stopPlayback()
    playRadioChirp(clip.toneFreq || 520)
    setPlayingId(clip.id)

    const safeUrl = safeHttpUrl(clip.url)
    if (safeUrl) {
      const audio = new Audio(safeUrl)
      audioRef.current = audio
      audio.onended = () => {
        playRadioChirp(420)
        setPlayingId(null)
      }
      audio.onerror = () => setPlayingId(null)
      audio.play().catch(() => {
        timerRef.current = setTimeout(() => setPlayingId(null), 3600)
      })
      return
    }

    // Vault quote playback: use SpeechSynthesis if supported, with timed equalizer fallback
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const cleanText = String(clip.quote || '').replace(/[“”"]/g, '')
        const utter = new SpeechSynthesisUtterance(cleanText)
        utter.rate = 1.06
        utter.pitch = 0.98
        utter.onend = () => {
          playRadioChirp(420)
          setPlayingId(null)
        }
        utter.onerror = () => setPlayingId(null)
        window.speechSynthesis.speak(utter)
        timerRef.current = setTimeout(() => setPlayingId(null), 6500)
        return
      }
    } catch {
      /* fallback to visual waveform timer */
    }

    timerRef.current = setTimeout(() => {
      playRadioChirp(420)
      setPlayingId(null)
    }, 3800)
  }

  const copyQuote = async (clip) => {
    const text = `${clip.quote} — ${clip.speaker} (${clip.context})`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(clip.id)
      setTimeout(() => setCopiedId((prev) => (prev === clip.id ? null : prev)), 1800)
    } catch {
      /* ignore */
    }
  }

  const visibleClips = compact ? clips.slice(0, 4) : clips

  if (!visibleClips.length) return null

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-pulse/20 text-brand-strong">
            <Radio size={14} />
          </span>
          <div>
            <h2 className="text-[19px] font-semibold leading-tight text-ink">
              Mic’d Up & Team Radio
            </h2>
            <p className="text-[12px] text-muted">
              Pit-wall transmissions, stump-mic gold & touchline soundbites
            </p>
          </div>
        </div>
        <span className="rounded-full bg-sage px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-brand-strong">
          <Volume2 size={11} className="mr-1 inline-block" />
          TAP TO PLAY
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleClips.map((clip) => {
          const isPlaying = playingId === clip.id
          const isHyped = Boolean(radioHypes?.[clip.id])
          const totalHype = (clip.hypeCount || 400) + (isHyped ? 1 : 0)
          const sportMeta = SPORT_BADGE_META[clip.sport] || SPORT_BADGE_META.f1

          return (
            <motion.div
              key={clip.id}
              layout
              className={`flex flex-col justify-between rounded-[20px] border p-4 transition-all ${
                isPlaying
                  ? 'border-pulse bg-sage-tint shadow-sm ring-1 ring-pulse/40'
                  : 'border-hairline bg-white shadow-sm hover:border-ink/25'
              }`}
            >
              <div>
                {/* Top Speaker & Vibe Tag Row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-7 w-[3px] shrink-0 rounded-full"
                      style={{ backgroundColor: hexColor(clip.colour) }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[14px] font-bold text-ink">
                          {clip.speaker}
                        </span>
                        <span className="rounded bg-sage px-1.5 py-0.5 font-display text-[10px] font-bold text-muted">
                          {clip.acro}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-medium text-muted">
                        {clip.context}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-full bg-sage px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-ink">
                    {clip.vibeTag || sportMeta.label}
                  </span>
                </div>

                {/* Quote Bubble */}
                <p className="mt-3 text-[13px] font-medium leading-relaxed text-ink sm:text-[14px]">
                  {clip.quote}
                </p>
              </div>

              {/* Bottom Controls: Play + Equalizer + Hype + Copy */}
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-hairline/80 pt-3">
                <button
                  type="button"
                  onClick={() => togglePlay(clip)}
                  className={`inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[11px] font-bold transition-colors ${
                    isPlaying
                      ? 'bg-ink text-white'
                      : 'bg-pulse text-ink hover:opacity-90'
                  }`}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'Transmitting' : clip.isLiveAudio ? 'Play MP3' : 'Play Mic'}</span>

                  {/* Animated 4-bar Equalizer when playing */}
                  {isPlaying && (
                    <span className="ml-0.5 flex items-end gap-0.5">
                      {[0, 1, 2, 3].map((b) => (
                        <motion.span
                          key={b}
                          animate={{ height: ['4px', '12px', '5px', '10px', '4px'] }}
                          transition={{
                            duration: 0.7,
                            repeat: Infinity,
                            delay: b * 0.12,
                          }}
                          className="w-[2px] rounded-full bg-pulse"
                        />
                      ))}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleRadioHype(clip.id)}
                    aria-label="Hype quote"
                    className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors ${
                      isHyped
                        ? 'bg-live text-white'
                        : 'bg-sage text-muted hover:text-ink'
                    }`}
                  >
                    <Flame size={12} />
                    <span>{totalHype}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyQuote(clip)}
                    title="Copy quote"
                    aria-label="Copy quote"
                    className="grid h-8 w-8 place-items-center rounded-full bg-sage text-muted transition-colors hover:text-ink"
                  >
                    {copiedId === clip.id ? <Check size={13} className="text-brand-strong" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
