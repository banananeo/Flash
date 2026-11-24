import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, Flame, ShieldCheck, Skull, Sparkles } from 'lucide-react'
import { SPORT_BADGE_META, TIER_META } from '../../data/mockPaddock'
import { timeAgo } from '../../hooks/useNews'
import { safeImageUrl } from '../../lib/safeUrl'
import { useNewsStore } from '../../store/useNewsStore'

function deriveSeedVotes(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997
  }
  return {
    w: 240 + (hash % 380),
    cooked: 45 + ((hash * 7) % 140),
  }
}

export default function TransferRadarCard({ item, onReadFull }) {
  const userVerdict = useNewsStore((s) => s.radarVotes?.[item?.id] || null)
  const voteRadar = useNewsStore((s) => s.voteRadar)
  const [imgOk, setImgOk] = useState(true)

  if (!item) return null

  const tierKey = TIER_META[item.tier] ? item.tier : 'heating-up'
  const tierMeta = TIER_META[tierKey]
  const sportKey = SPORT_BADGE_META[item.sport] ? item.sport : SPORT_BADGE_META[item.category] ? item.category : 'football'
  const sportMeta = SPORT_BADGE_META[sportKey]
  const reliability = Math.max(12, Math.min(99, Number(item.reliabilityPct) || 82))

  const seeds = deriveSeedVotes(String(item.id || item.title))
  const wCount = (item.wVotes ?? seeds.w) + (userVerdict === 'w' ? 1 : 0)
  const cookedCount = (item.cookedVotes ?? seeds.cooked) + (userVerdict === 'cooked' ? 1 : 0)
  const totalVotes = Math.max(1, wCount + cookedCount)
  const wPct = Math.round((wCount / totalVotes) * 100)
  const cookedPct = 100 - wPct

  const imageSrc = safeImageUrl(item.image)

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col justify-between overflow-hidden rounded-[22px] border border-hairline bg-white shadow-sm transition-colors hover:border-ink/25"
    >
      <div>
        {/* Top Banner: Tier Pill + Reliability Meter + Sport Tag */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline/70 bg-sage/45 px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${tierMeta.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${tierMeta.dotClass}`} />
              {tierMeta.label}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-ink">
              <ShieldCheck size={13} className="text-brand-strong" />
              {reliability}% Reliability
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink ring-1 ring-hairline">
              {sportMeta.label}
            </span>
          </div>
        </div>

        {/* Reliability Gauge Strip */}
        <div className="h-1 w-full bg-sage">
          <div
            className={`h-full transition-all duration-500 ${tierMeta.barClass}`}
            style={{ width: `${reliability}%` }}
          />
        </div>

        <div className="p-5">
          {/* Subject + Transfer Move Strip (when structured transfer/seat move) */}
          {item.fromTeam && item.toTeam && (
            <div className="mb-3.5 rounded-[16px] bg-sage/75 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[15px] font-bold text-ink">{item.subject}</p>
                  {item.role && (
                    <p className="text-[11px] font-medium text-muted">{item.role}</p>
                  )}
                </div>
                {item.dealTag && (
                  <span className="rounded-full bg-white px-2.5 py-1 font-display text-[11px] font-bold text-brand-strong shadow-sm">
                    {item.dealTag}
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-[12px] font-bold text-ink">
                <span className="truncate rounded-lg bg-white px-2.5 py-1 ring-1 ring-hairline">
                  {item.fromTeam}
                </span>
                <ArrowRight size={14} className="shrink-0 text-brand-strong" />
                <span className="truncate rounded-lg bg-pulse/20 px-2.5 py-1 text-ink ring-1 ring-pulse/40">
                  {item.toTeam}
                </span>
              </div>
            </div>
          )}

          {/* Optional Compact Image + Headline for Live Wire items */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
                {item.source || 'Paddock Wire'}
                {item.publishedAt ? `  ·  ${timeAgo(item.publishedAt)}` : ''}
              </p>
              <h3 className="mt-1.5 text-[18px] font-semibold leading-snug tracking-[-0.015em] text-ink sm:text-[20px]">
                {item.title}
              </h3>
            </div>

            {imgOk && imageSrc && !item.fromTeam && (
              <img
                src={imageSrc}
                alt={item.title}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                onError={() => setImgOk(false)}
                className="h-20 w-24 shrink-0 rounded-[14px] bg-sage object-cover sm:h-24 sm:w-32"
              />
            )}
          </div>

          {/* 3-Bullet Insider Drop OR Summary */}
          {Array.isArray(item.bullets) && item.bullets.length > 0 ? (
            <ul className="mt-3.5 space-y-2 rounded-[16px] bg-sage/50 p-3.5 text-[13px] leading-relaxed text-ink">
              {item.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Sparkles size={13} className="mt-1 shrink-0 text-brand-strong" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            item.summary && (
              <p className="mt-2.5 line-clamp-3 text-[14px] leading-relaxed text-muted">
                {item.summary}
              </p>
            )
          )}
        </div>
      </div>

      {/* Bottom Interactive Crowd Verdict Bar: W Move vs Cooked + Read Intel */}
      <div className="border-t border-hairline/80 bg-paper/60 px-5 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => voteRadar(item.id, 'w')}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-all ${
                userVerdict === 'w'
                  ? 'bg-pulse text-ink shadow-sm ring-1 ring-ink/15'
                  : 'bg-sage text-ink hover:bg-hairline'
              }`}
            >
              <Flame size={12} className={userVerdict === 'w' ? 'text-ink' : 'text-brand-strong'} />
              <span>W Move</span>
              <span className="font-display font-bold">{wPct}%</span>
            </button>

            <button
              type="button"
              onClick={() => voteRadar(item.id, 'cooked')}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold transition-all ${
                userVerdict === 'cooked'
                  ? 'bg-ink text-white shadow-sm'
                  : 'bg-sage text-muted hover:bg-hairline hover:text-ink'
              }`}
            >
              <Skull size={12} />
              <span>Cooked</span>
              <span className="font-display font-bold">{cookedPct}%</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onReadFull?.(item)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-bold text-ink ring-1 ring-hairline transition-colors hover:bg-sage"
          >
            <BookOpen size={12} className="text-brand-strong" />
            <span>Full Intel</span>
          </button>
        </div>
      </div>
    </motion.article>
  )
}
