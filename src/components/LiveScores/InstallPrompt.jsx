import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

// Captures beforeinstallprompt → quiet editorial install banner.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('flash-install-dismissed') === '1'
    } catch {
      return false
    }
  })
  const [prompting, setPrompting] = useState(false)

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred || dismissed) return null

  const install = async () => {
    if (prompting) return
    setPrompting(true)
    try {
      deferred.prompt()
      await deferred.userChoice.catch(() => null)
    } catch { /* ignore */ } finally {
      setDeferred(null)
      setPrompting(false)
    }
  }

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem('flash-install-dismissed', '1')
    } catch { /* ignore */ }
  }

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-24 left-6 right-6 z-40 flex items-center gap-3 rounded-[16px] border border-hairline bg-white px-4 py-3 text-ink shadow-lg lg:bottom-6 lg:left-auto lg:right-8 lg:w-80"
    >
      <p className="flex-1 text-[12px] font-medium leading-snug">
        Install <span className="font-display font-bold">flash</span> for instant briefings
      </p>
      <button
        type="button"
        onClick={install}
        disabled={prompting}
        className="shrink-0 rounded-full bg-pulse px-3.5 py-1.5 text-[11px] font-bold text-ink disabled:opacity-60"
      >
        {prompting ? '…' : 'Install'}
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 text-muted hover:text-ink"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}
