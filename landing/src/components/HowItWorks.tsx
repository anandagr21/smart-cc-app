import { motion, useInView } from "motion/react";
import { useRef } from "react";
import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";
import { SparklesIcon } from "./Icons";

const steps = [
  {
    num: "01",
    icon: (
      <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    iconBg: "bg-brand-500/10 border-brand-500/20",
    accentColor: "#F59E0B",
    title: "Add Your Cards",
    desc: "Enter card name, bank, and network. We fetch the rest from our database of 60+ card profiles — automatically.",
    detail: "Takes under 30 seconds per card",
  },
  {
    num: "02",
    icon: (
      <svg className="w-7 h-7 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z" />
      </svg>
    ),
    iconBg: "bg-accent-500/10 border-accent-500/20",
    accentColor: "#14B8A6",
    title: "Track Fee Waivers",
    desc: "We auto-detect your cards' annual fee waiver thresholds. See exactly how much more to spend on each card to avoid paying the fee — before the deadline hits.",
    detail: "Never pay an annual fee again",
  },
  {
    num: "03",
    icon: <SparklesIcon className="w-7 h-7 text-green-400" />,
    iconBg: "bg-green-500/10 border-green-500/20",
    accentColor: "#10B981",
    title: "Know Which Card to Use",
    desc: "Open the app at checkout, enter the merchant, and instantly see your best card. Track fee waivers, milestone progress, and missed savings — all in one place.",
    detail: "One tap at checkout",
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className="relative"
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {/* Step number — large bg watermark */}
      <div
        className="absolute -top-4 -left-2 text-8xl font-extrabold select-none pointer-events-none leading-none"
        style={{ color: step.accentColor, opacity: 0.06 }}
      >
        {step.num}
      </div>

      <div className="glass-card rounded-2xl p-7 relative overflow-hidden group hover:bg-white/[0.07] transition-colors duration-300 cursor-default">
        {/* Corner accent */}
        <div
          className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
          style={{ background: `radial-gradient(circle, ${step.accentColor}, transparent 70%)` }}
        />

        {/* Step badge */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg"
            style={{ background: step.accentColor, boxShadow: `0 4px 16px ${step.accentColor}40` }}
          >
            {step.num}
          </div>
          <div className={`w-10 h-10 rounded-xl ${step.iconBg} border flex items-center justify-center`}>
            {step.icon}
          </div>
        </div>

        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
        <p className="text-white/40 text-sm leading-relaxed mb-4">{step.desc}</p>

        <div
          className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1"
          style={{ color: step.accentColor, background: `${step.accentColor}15`, border: `1px solid ${step.accentColor}25` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: step.accentColor }} />
          {step.detail}
        </div>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const lineRef = useRef<HTMLDivElement>(null);
  const lineInView = useInView(lineRef, { once: true });

  return (
    <section id="how-it-works" className="relative py-20 md:py-28 overflow-hidden">
      {/* Right glow */}
      <div
        className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <ScrollReveal>
            <SectionBadge color="brand">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Simple Setup
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Up and running in{" "}
              <span className="text-gradient">under 2 minutes</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              No bank linking required. No read access to your accounts. Your data stays private — always.
            </p>
          </ScrollReveal>
        </div>

        {/* Steps */}
        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Animated connector line */}
          <div
            ref={lineRef}
            className="hidden md:block absolute top-14 left-[calc(16.6%+1rem)] right-[calc(16.6%+1rem)] h-px overflow-hidden"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, #F59E0B, #14B8A6, #10B981)" }}
              initial={{ scaleX: 0, originX: 0 }}
              animate={lineInView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
            />
          </div>

          {steps.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} />
          ))}
        </div>

        {/* Why Not Excel? comparison */}
        <ScrollReveal delay={0.3}>
          <div className="mt-14 glass-card rounded-2xl p-8 relative overflow-hidden">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              {/* Left: The old way */}
              <div>
                <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4">
                  The Excel Approach
                </p>
                <div className="space-y-3">
                  {[
                    "One column for Swiggy. One for fuel. One for Amazon.",
                    "Manually update every time a bank changes a reward rate.",
                    "Miss a quarterly cap because you forgot to check your sheet.",
                    "Card devalued? Hope you read the 30-page T&C PDF.",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-rose-400/60 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-white/40 text-sm">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Card Analyser way */}
              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">
                  Card Analyser
                </p>
                <div className="space-y-3">
                  {[
                    "Supports 79 Indian cards. We update when banks do.",
                    "Auto-detects reward caps, exclusions, and category limits.",
                    "One tap to see your best card for any purchase.",
                    "Fee waiver deadlines? Tracked. Milestones? Tracked.",
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-white/70 text-sm">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Bottom trust bar */}
        <ScrollReveal delay={0.4}>
          <div className="mt-14 glass-card rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-center gap-8 text-center sm:text-left">
            {[
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", text: "No bank credentials ever stored" },
              { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Bank-grade AES-256 encryption" },
              { icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z", text: "Data never sold to third parties" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl glass flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
