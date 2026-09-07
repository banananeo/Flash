import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

// Captures beforeinstallprompt → brutal install bar. Required for home-screen install.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!deferred || dismissed) return null

  const install = async () => {
    deferred.prompt()
    await deferred.userChoice.catch(() => null)
    setDeferred(null)
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-16 left-3 right-3 z-40 flex items-center gap-2 border-[3px] border-black bg-brutal-yellow p-2.5 shadow-brutal-sm lg:left-auto lg:right-6 lg:w-80"
    >
      <Download size={18} strokeWidth={3} className="shrink-0" />
      <p className="text-xs font-black uppercase leading-tight">Install FLASH! on your home screen</p>
      <button onClick={install} className="ml-auto shrink-0 border-2 border-black bg-black px-2 py-1 text-[11px] font-black text-white">
        INSTALL
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 border-2 border-black bg-white px-1.5 py-0.5 text-[11px] font-black">
        ✕
      </button>
    </motion.div>
  )
}
