import { motion } from "motion/react";
import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";
import { ZapIcon, SparklesIcon, TrendingUpIcon } from "./Icons";

const features = [
  {
    icon: SparklesIcon,
    iconColor: "text-accent-400",
    iconBg: "bg-accent-500/10 border-accent-500/20",
    glowColor: "rgba(139,92,246,0.15)",
    title: "AI Spending Insights",
    desc: "At checkout, open the app, enter the merchant, and instantly see which card earns the most rewards. No more guessing between your HDFC and Amex.",
    tag: "Powered by AI",
    tagColor: "text-accent-400 bg-accent-500/10 border-accent-500/20",
    featured: true,
    metric: "3.2×",
    metricLabel: "avg reward multiplier",
  },
  {
    icon: ZapIcon,
    iconColor: "text-brand-400",
    iconBg: "bg-brand-500/10 border-brand-500/20",
    glowColor: "rgba(245,158,11,0.12)",
    title: "Fee Waiver Tracking",
    desc: "Real-time progress bars show exactly how close you are to waiving every card's annual fee.",
    tag: "Never pay again",
    tagColor: "text-brand-400 bg-brand-500/10 border-brand-500/20",
    featured: false,
    metric: "₹15K",
    metricLabel: "avg annual fee saved",
  },
  {
    icon: TrendingUpIcon,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10 border-green-500/20",
    glowColor: "rgba(16,185,129,0.12)",
    title: "Portfolio Optimisation",
    desc: "See which cards earn the most and which are dead weight. Get AI recommendations to upgrade, downgrade, or cancel.",
    tag: "Data-driven",
    tagColor: "text-green-400 bg-green-500/10 border-green-500/20",
    featured: false,
    metric: "60+",
    metricLabel: "card profiles",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-20 md:py-28 overflow-hidden">
      {/* Subtle radial bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <ScrollReveal>
            <SectionBadge>
              <ZapIcon className="w-3.5 h-3.5" />
              Powerful Features
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Everything you need to{" "}
              <span className="text-gradient">dominate your wallet</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              Whether you carry 2 cards or 12. Track, optimise, and save — automatically.
            </p>
          </ScrollReveal>
        </div>

        {/* Bento Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 0.1} className={f.featured ? "md:col-span-2 lg:col-span-1 lg:row-span-1" : ""}>
              <div
                className="relative glass-card rounded-2xl p-6 h-full overflow-hidden group cursor-pointer feature-card"
              >
                {/* Hover glow — CSS opacity only, no JS animation */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 0%, ${f.glowColor}, transparent 70%)` }}
                />

                {/* Tag */}
                <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border mb-4 ${f.tagColor}`}>
                  {f.tag}
                </div>

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${f.iconBg} border flex items-center justify-center mb-4 icon-glow transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>

                <h3 className="text-lg font-bold mb-2 text-white">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed mb-6">{f.desc}</p>

                {/* Metric */}
                <div className="mt-auto pt-4 border-t border-white/5 flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-extrabold text-white">{f.metric}</p>
                    <p className="text-white/30 text-xs mt-0.5">{f.metricLabel}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full glass flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}

          {/* Wide CTA card */}
          <ScrollReveal delay={0.4} className="md:col-span-2 lg:col-span-3">
            <div className="relative glass-card rounded-2xl p-8 overflow-hidden group cursor-pointer feature-card">
              <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(245,158,11,0.04) 100%)" }} />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-2">Everything in one place</p>
                  <h3 className="text-2xl font-bold text-white">
                    Supports <span className="text-gradient">60+ Indian credit cards</span>
                  </h3>
                  <p className="text-white/40 text-sm mt-1.5">HDFC, SBI, ICICI, Amex, Axis, Kotak, Yes Bank and more — all auto-populated.</p>
                </div>
                <div className="flex -space-x-3 flex-shrink-0">
                  {["from-amber-500 to-orange-600","from-blue-600 to-indigo-700","from-green-500 to-emerald-600","from-purple-600 to-violet-700","from-rose-500 to-pink-600"].map((g, i) => (
                    <motion.div
                      key={i}
                      className={`w-12 h-8 rounded-lg bg-gradient-to-r ${g} border-2 border-surface-950 shadow-lg`}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                    />
                  ))}
                  <div className="w-12 h-8 rounded-lg glass border-2 border-white/10 flex items-center justify-center text-white/50 text-xs font-bold">
                    +55
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
