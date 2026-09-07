import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-[4px] border-black bg-brutal-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-3">
        <motion.div
          whileHover={{ rotate: -2, scale: 1.03 }}
          whileTap={{ scale: 0.96, rotate: 1 }}
          className="flex items-center gap-2 border-[4px] border-black bg-brutal-yellow px-4 py-1.5 shadow-brutal-sm"
        >
          <span className="grid h-9 w-9 place-items-center border-[3px] border-black bg-black text-brutal-yellow">
            <Zap size={22} strokeWidth={3} />
          </span>
          <p className="font-black text-3xl tracking-tighter">FLASH!</p>
        </motion.div>
      </div>
    </header>
  )
}
