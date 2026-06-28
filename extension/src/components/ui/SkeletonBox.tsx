interface SkeletonBoxProps {
  width?: string
  height?: string
  className?: string
}

export function SkeletonBox({ width = "100%", height = "16px", className = "" }: SkeletonBoxProps) {
  return (
    <div
      className={`plasmo-animate-pulse plasmo-bg-slate-700/50 plasmo-rounded-lg ${className}`}
      style={{ width, height }}
    />
  )
}
