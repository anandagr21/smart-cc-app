import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";
import { CheckIcon } from "./Icons";

const tiers = [
  {
    name: "Starter",
    monthlyPrice: "Free",
    annualPrice: "Free",
    period: "forever",
    featured: false,
    badge: null,
    desc: "Perfect for exploring Smart CC with up to 3 cards.",
    features: [
      "Up to 3 cards",
      "Basic fee waiver tracking",
      "Monthly spending summary",
      "Manual card entry",
    ],
    cta: "Get Started",
    ctaHref: "#cta",
  },
  {
    name: "Pro",
    monthlyPrice: "₹299",
    annualPrice: "₹199",
    period: "/month",
    featured: true,
    badge: "Most Popular",
    desc: "For serious cardholders who want to maximise every rupee.",
    features: [
      "Unlimited cards",
      "AI-powered spend insights",
      "Real-time fee waiver tracker",
      "Portfolio optimisation engine",
      "Milestone & reward tracking",
      "Smart push notifications",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaHref: "#cta",
  },
  {
    name: "Family",
    monthlyPrice: "₹599",
    annualPrice: "₹399",
    period: "/month",
    featured: false,
    badge: null,
    desc: "Share the benefits across the whole household.",
    features: [
      "Everything in Pro",
      "Up to 4 family members",
      "Shared family wallet view",
      "Cross-member optimisation",
      "Priority support",
    ],
    cta: "Start Free Trial",
    ctaHref: "#cta",
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-20 md:py-28 overflow-hidden">
      {/* Left glow */}
      <div
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <ScrollReveal>
            <SectionBadge color="brand">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Simple Pricing
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Start free,{" "}
              <span className="text-gradient">upgrade when ready</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              No credit card required. No hidden fees. Cancel anytime.
            </p>
          </ScrollReveal>

          {/* Toggle */}
          <ScrollReveal delay={0.1}>
            <div className="inline-flex items-center gap-3 glass rounded-full p-1.5 mt-8">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  !annual ? "bg-white/10 text-white shadow-inner" : "text-white/40 hover:text-white/70"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  annual ? "bg-white/10 text-white shadow-inner" : "text-white/40 hover:text-white/70"
                }`}
              >
                Annual
                <span className="text-[10px] font-bold text-green-400 bg-green-500/15 rounded-full px-2 py-0.5">−33%</span>
              </button>
            </div>
          </ScrollReveal>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={i * 0.1}>
              <div
                className={`relative rounded-3xl p-8 h-full flex flex-col pricing-card ${
                  tier.featured
                    ? "gradient-border glass-strong"
                    : "glass-card"
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-accent-500/30 whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}

                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${tier.featured ? "text-accent-400" : "text-white/40"}`}>
                  {tier.name}
                </p>

                <div className="mb-2 flex items-end gap-1.5">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={annual ? "annual" : "monthly"}
                      className="text-5xl font-extrabold text-white"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {annual ? tier.annualPrice : tier.monthlyPrice}
                    </motion.span>
                  </AnimatePresence>
                  {tier.period !== "forever" && (
                    <span className="text-white/30 text-sm mb-1.5">{tier.period}</span>
                  )}
                </div>

                {annual && tier.period !== "forever" && (
                  <motion.p
                    className="text-green-400 text-xs font-semibold mb-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    Billed annually · Save 33%
                  </motion.p>
                )}

                <p className="text-white/35 text-sm mb-6">{tier.desc}</p>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/60">
                      <CheckIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tier.featured ? "text-accent-400" : "text-brand-400"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.ctaHref}
                  className={`block w-full text-center py-3.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                    tier.featured
                      ? "bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/30 hover:shadow-accent-500/50"
                      : "glass-strong text-white hover:bg-white/10 hover:border-white/20"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* FAQ-style footer note */}
        <ScrollReveal delay={0.3}>
          <p className="text-center text-white/25 text-sm mt-10">
            All plans include a 14-day free trial of Pro features. No credit card needed.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
