import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {
    // Isolate render errors gracefully without exposing internals
  }

  handleReset = () => {
    this.setState({ hasError: false })
    this.props.onReset?.()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="mx-auto my-10 max-w-md rounded-[20px] border border-hairline bg-white p-6 text-center shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            SOMETHING WENT WRONG
          </p>
          <h2 className="mt-2 text-[20px] font-semibold text-ink">
            This view hit an unexpected snag.
          </h2>
          <p className="mt-1.5 text-[13px] text-muted">
            Your saved preferences are safe. Reload this section to continue.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 rounded-full bg-pulse px-5 py-2 text-[13px] font-bold text-ink transition-opacity hover:opacity-90"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
