import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  color?: "accent" | "brand" | "green" | "cyan";
}

const colorMap = {
  accent: "text-accent-400 border-accent-500/20 bg-accent-500/8",
  brand:  "text-brand-400  border-brand-500/20  bg-brand-500/8",
  green:  "text-green-400  border-green-500/20  bg-green-500/8",
  cyan:   "text-cyan-400   border-cyan-500/20   bg-cyan-500/8",
};

export default function SectionBadge({ children, color = "accent" }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-5 border ${colorMap[color]}`}
    >
      {children}
    </div>
  );
}
