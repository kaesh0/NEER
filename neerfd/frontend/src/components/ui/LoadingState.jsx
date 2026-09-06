/**
 * Loading skeleton state for marine data pages.
 * Shows pulsing placeholder cards matching the app's design system.
 */
export default function LoadingState({ message = 'Loading marine intelligence...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] px-4 ${className}`}>
      {/* Animated wave dots */}
      <div className="flex gap-1.5 mb-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-neer-accent"
            style={{
              animation: 'pulse 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <p className="text-neer-ink-muted text-sm font-medium">{message}</p>

      {/* Skeleton cards */}
      <div className="w-full max-w-md mt-8 space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-xl bg-neer-surface-alt animate-pulse"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
