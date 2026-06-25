import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="plasmo-flex plasmo-items-start plasmo-gap-3 plasmo-bg-red-500/10 plasmo-border plasmo-border-red-500/30 plasmo-rounded-xl plasmo-p-4 plasmo-mb-4">
      <AlertCircle className="plasmo-w-5 plasmo-h-5 plasmo-text-red-400 plasmo-shrink-0 plasmo-mt-0.5" />
      <div className="plasmo-flex-1">
        <p className="plasmo-text-sm plasmo-text-red-300">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-text-xs plasmo-text-red-400 plasmo-font-medium plasmo-mt-2 hover:plasmo-text-red-300 plasmo-transition-colors"
          >
            <RefreshCw className="plasmo-w-3 plasmo-h-3" /> Retry
          </button>
        )}
      </div>
    </div>
  )
}
