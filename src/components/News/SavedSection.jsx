import { useMemo, useState } from 'react'
import { useNewsStore } from '../../store/useNewsStore'
import { useScoreStore } from '../../store/useScoreStore'
import { categoryLabel } from '../../data/mockNews'
import bookmarkIcon from '../../assets/icons/bookmark.svg'

function savedDateLabel(iso) {
  if (!iso) return 'Saved'
  try {
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return 'Saved today'
    return `Saved ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
  } catch {
    return 'Saved'
  }
}

// 04 · Saved stories — personal collection with All / News / Sport pills.
export default function SavedSection() {
  const saved = useNewsStore((s) => s.saved)
  const toggleSave = useNewsStore((s) => s.toggleSave)
  const openReader = useNewsStore((s) => s.openReader)
  const setView = useScoreStore((s) => s.setView)
  const [filter, setFilter] = useState('all') // all | news | sport

  const counts = useMemo(() => {
    const sport = saved.filter((a) => a.category === 'sports').length
    return { all: saved.length, news: saved.length - sport, sport }
  }, [saved])

  const visible = useMemo(() => {
    if (filter === 'sport') return saved.filter((a) => a.category === 'sports')
    if (filter === 'news') return saved.filter((a) => a.category !== 'sports')
    return saved
  }, [saved, filter])

  const hero = visible[0] || null
  const rest = visible.slice(1)

  const pills = [
    { id: 'all', label: `All saved  ${counts.all}` },
    { id: 'news', label: `News  ${counts.news}` },
    { id: 'sport', label: `Sport  ${counts.sport}` },
  ]

  return (
    <section className="mx-auto w-full max-w-[460px] px-6 pb-28 pt-2 lg:max-w-[780px] lg:pt-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
        YOUR PERSONAL EDIT
      </p>
      <h1 className="mt-1.5 text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
        Worth keeping.
      </h1>
      <p className="mt-1.5 text-[14px] text-muted">Good stories. On your time.</p>

      <div className="no-scrollbar -mx-6 mt-5 flex gap-2 overflow-x-auto px-6 lg:mx-0 lg:px-0">
        {pills.map((p) => {
          const active = filter === p.id
          return (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={`shrink-0 whitespace-pre rounded-full px-4 py-1.5 text-[13px] transition-colors ${
                active ? 'bg-pulse font-semibold text-ink' : 'bg-sage font-medium text-muted hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {!visible.length ? (
        <div className="mt-8 rounded-[20px] bg-white p-8 text-center">
          <p className="text-[18px] font-semibold text-ink">Nothing saved yet.</p>
          <p className="mt-1.5 text-[13px] text-muted">
            Tap the bookmark icon on any briefing story to keep it here for later.
          </p>
          <button
            type="button"
            onClick={() => setView('news')}
            className="mt-5 rounded-full bg-pulse px-5 py-2.5 text-[13px] font-bold text-ink"
          >
            Browse briefing
          </button>
        </div>
      ) : (
        <>
          {hero && (
            <article onClick={() => openReader(hero)} className="group mt-6 cursor-pointer">
              <div className="overflow-hidden rounded-[16px] bg-sage">
                <img
                  src={hero.image}
                  alt={hero.title}
                  className="h-[210px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02] sm:h-[260px]"
                />
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                {categoryLabel(hero.category).toUpperCase()}
              </p>
              <h2 className="mt-1.5 text-[24px] font-semibold leading-[1.24] text-ink">
                {hero.title}
              </h2>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[12px] font-medium text-muted">
                  {savedDateLabel(hero.savedAt)} · {hero.readTime || '4 min read'}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSave(hero)
                  }}
                  aria-label="Remove from saved"
                  className="grid h-8 w-8 place-items-center rounded-full bg-pulse"
                >
                  <img src={bookmarkIcon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                </button>
              </div>
            </article>
          )}

          {rest.length > 0 && (
            <>
              <div className="my-5 h-px w-full bg-hairline" />
              <div className="space-y-5">
                {rest.map((a) => (
                  <article
                    key={a.id}
                    onClick={() => openReader(a)}
                    className="group flex cursor-pointer items-center gap-3.5"
                  >
                    <img
                      src={a.image}
                      alt=""
                      loading="lazy"
                      className="h-[80px] w-[80px] shrink-0 rounded-[14px] bg-sage object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] text-ink group-hover:underline">
                        {a.title}
                      </h3>
                      <p className="mt-2 text-[12px] font-medium text-muted">
                        {categoryLabel(a.category)} · {a.readTime || '3 min read'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleSave(a)
                      }}
                      aria-label="Remove from saved"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-sage"
                    >
                      <img src={bookmarkIcon} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 border-t border-hairline pt-4">
            <p className="text-[12px] font-medium text-muted">
              {visible.length} {visible.length === 1 ? 'story' : 'stories'} in your collection
            </p>
          </div>
        </>
      )}
    </section>
  )
}
