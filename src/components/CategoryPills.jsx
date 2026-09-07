import { motion } from 'framer-motion'
import { CATEGORIES } from '../data/mockNews'
import { useNewsStore } from '../store/useNewsStore'

export default function CategoryPills() {
  const category = useNewsStore((s) => s.category)
  const setCategory = useNewsStore((s) => s.setCategory)

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-4">
      {CATEGORIES.map((c) => {
        const active = category === c.id
        return (
          <motion.button
            key={c.id}
            whileHover={{ y: -3, rotate: active ? 0 : -1 }}
            whileTap={{ scale: 0.9, rotate: 2 }}
            onClick={() => setCategory(c.id)}
            className={`relative shrink-0 border-[3px] border-black px-4 py-1.5 text-sm font-black uppercase tracking-wide transition-shadow ${
              active ? 'text-white shadow-brutal-sm' : 'bg-white shadow-brutal-xs hover:shadow-brutal-sm'
            }`}
            style={{ backgroundColor: active ? '#000' : c.bg === '#000000' ? '#fff' : c.bg }}
          >
            {active && (
              <motion.span
                layoutId="pill-blob"
                className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-brutal-yellow text-[10px] text-black"
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                ★
              </motion.span>
            )}
            {c.label}
          </motion.button>
        )
      })}
    </div>
  )
}
