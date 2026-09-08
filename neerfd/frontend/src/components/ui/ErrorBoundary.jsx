import React from 'react'
import Icon from '../../icons/Icon.jsx'

/**
 * ErrorBoundary — protects the NEER application against unexpected runtime crashes.
 *
 * Catches JavaScript errors anywhere in child component trees, logs the error,
 * and renders a polished recovery card instead of unmounting to a blank white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[NEER ErrorBoundary] Caught unhandled component error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props
      if (fallback) {
        return typeof fallback === 'function' ? fallback(this.state.error, this.handleReset) : fallback
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 text-white font-sans">
          <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center animate-fade-in">
            {/* Warning Icon Badge */}
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-inner">
              <Icon name="alertTriangle" size={28} />
            </div>

            {/* Title & Description */}
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
              Something interrupted this view
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              An unexpected issue occurred while rendering this interface. Your data remains safe, and reloading the workspace will restore your session.
            </p>

            {/* Recovery Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto flex-1 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="refresh" size={16} />
                <span>Reload Workspace</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-sm transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>

            {/* Collapsible Diagnostics for Technical Showcase */}
            {this.state.error && (
              <details className="w-full text-left mt-2 text-xs text-slate-400 border-t border-slate-700/60 pt-3">
                <summary className="cursor-pointer select-none text-slate-400 hover:text-slate-200 transition-colors">
                  Diagnostic details
                </summary>
                <div className="mt-2 p-2.5 rounded bg-slate-900/80 border border-slate-700/50 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-36">
                  {this.state.error?.toString() || 'Unknown error'}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
