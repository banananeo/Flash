import { AnimatePresence, motion } from 'framer-motion'
import { Trash2, X } from 'lucide-react'
import { useNewsStore } from '../store/useNewsStore'
import { categoryStyle } from '../data/mockNews'

export default function BookmarkDrawer() {
  const show = useNewsStore((s) => s.showBookmarks)
  const toggle = useNewsStore((s) => s.toggleBookmarks)
  const bookmarks = useNewsStore((s) => s.bookmarks)
  const remove = useNewsStore((s) => s.removeBookmark)

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggle}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.aside
            initial={{ x: 420 }}
            animate={{ x: 0 }}
            exit={{ x: 420 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l-[4px] border-black bg-brutal-cream"
          >
            <div className="flex items-center justify-between border-b-[4px] border-black bg-brutal-pink p-4">
              <p className="font-black text-2xl tracking-tight">SAVED ★ {bookmarks.length}</p>
              <motion.button whileTap={{ scale: 0.85, rotate: 90 }} onClick={toggle} className="btn-brutal bg-white p-2">
                <X size={20} strokeWidth={3} />
              </motion.button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {bookmarks.length === 0 ? (
                <div className="card-brutal bg-white p-6 text-center">
                  <p className="font-black text-xl">NOTHING SAVED YET!</p>
                  <p className="mt-1 text-sm font-bold text-black/60">Swipe right on any card to hoard it here.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {bookmarks.map((b, i) => (
                    <motion.div
                      key={b.id}
                      initial={{ x: 60, opacity: 0, rotate: 1 }}
                      animate={{ x: 0, opacity: 1, rotate: i % 2 ? 0.5 : -0.5 }}
                      className="card-brutal bg-white p-3 shadow-brutal-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="badge-brutal" style={{ backgroundColor: categoryStyle(b.category).bg }}>
                          {categoryStyle(b.category).label}
                        </span>
                        <motion.button whileTap={{ scale: 0.8 }} onClick={() => remove(b.id)} className="border-2 border-black bg-brutal-red p-1 text-white">
                          <Trash2 size={14} strokeWidth={3} />
                        </motion.button>
                      </div>
                      <p className="mt-2 font-black leading-tight">{b.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-medium text-black/70">{b.summary}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
