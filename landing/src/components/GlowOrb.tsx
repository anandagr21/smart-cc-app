/* Static section glow orb — radial-gradient only, no blur filter, no JS animation */
interface Props {
  className?: string;
  size?: number;
  color?: string;
}

export default function GlowOrb({ className = "", size = 500, color = "#14B8A6" }: Props) {
  return (
    <div
      className={`glow-orb ${className}`}
      style={{
        width: size,
        height: size,
        /* Radial gradient creates soft edge — no filter:blur needed */
        background: `radial-gradient(circle, ${color}22 0%, ${color}08 40%, transparent 70%)`,
      }}
    />
  );
}
