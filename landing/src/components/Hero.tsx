import { motion } from "motion/react";
import { ArrowRightIcon } from "./Icons";

const stats = [
  { value: "₹2.4L", label: "Avg savings / year" },
  { value: "500+",  label: "Card profiles" },
  { value: "2 min", label: "Setup time" },
];

const cards = [
  { name: "HDFC Infinia",  network: "VISA",       progress: 65, color: "from-amber-500 to-orange-600" },
  { name: "Amex Platinum", network: "AMEX",       progress: 82, color: "from-slate-300 to-slate-500" },
  { name: "Axis Magnus",   network: "MASTERCARD", progress: 41, color: "from-purple-600 to-blue-700" },
  { name: "SBI Cashback",  network: "VISA",       progress: 93, color: "from-green-500 to-teal-600"  },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-20 overflow-hidden">
      {/* Static background grid — no animation, just CSS */}
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-950 pointer-events-none" />

      {/* Static glow orbs — opacity only, no scale, no blur filter animation */}
      <div className="hero-orb-left" />
      <div className="hero-orb-right" />

      <div className="relative max-w-6xl mx-auto px-6 w-full z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── Left column ─────────────────────────────── */}
          <div>
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-2.5 glass rounded-full px-4 py-1.5 text-xs font-semibold text-brand-400 mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <span className="relative w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-75" />
                <span className="relative block w-2 h-2 rounded-full bg-brand-500" />
              </span>
              Now in Public Beta · Join 2,000+ users
            </motion.div>

            {/* Headline */}
            <motion.h1
              className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.06] mb-5"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              Your cards,
              <br />
              <span className="text-gradient">finally smart.</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              className="text-lg text-white/50 leading-relaxed max-w-lg mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.5 }}
            >
              Stop juggling spreadsheets and missing due dates. Smart CC tracks every card,
              predicts fee waivers, and maximises rewards — powered by AI.
            </motion.p>

            {/* CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.44, duration: 0.5 }}
            >
              <a
                href="#cta"
                className="group inline-flex items-center justify-center px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-lg rounded-2xl transition-all duration-200 shadow-xl shadow-accent-500/30 hover:shadow-accent-500/50 cursor-pointer"
              >
                Get Started Free
                <ArrowRightIcon className="w-5 h-5 ml-2 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-8 py-4 glass-card text-white font-semibold text-lg rounded-2xl hover:bg-white/10 transition-all duration-200 cursor-pointer"
              >
                See How It Works
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="flex flex-wrap items-center gap-5 text-sm text-white/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.58, duration: 0.5 }}
            >
              {[
                { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", label: "Bank-grade encryption" },
                { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", label: "No bank linking" },
                { icon: "M5 13l4 4L19 7", label: "2,000+ cards tracked" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={b.icon} />
                  </svg>
                  {b.label}
                </div>
              ))}
            </motion.div>

            {/* Stats row */}
            <motion.div
              className="flex gap-8 mt-10 pt-8 border-t border-white/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.72 + i * 0.08 }}
                >
                  <p className="text-2xl font-extrabold text-white">{s.value}</p>
                  <p className="text-xs text-white/35 mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* ── Right column — Dashboard mockup ─────────── */}
          <div className="relative hidden lg:block">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative"
            >
              {/* Main dashboard card */}
              <div className="hero-card p-6 relative overflow-hidden">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-0.5">Smart CC Dashboard</p>
                    <p className="text-white font-bold text-lg">My Card Portfolio</p>
                  </div>
                  <div className="flex items-center gap-1.5 glass rounded-full px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-xs text-white/60 font-medium">Live</span>
                  </div>
                </div>

                {/* Card list */}
                <div className="space-y-3 mb-5">
                  {cards.map((card, i) => (
                    <motion.div
                      key={card.name}
                      className="glass-card rounded-xl p-3.5 flex items-center gap-3"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                    >
                      <div className={`w-10 h-7 rounded-md bg-gradient-to-r ${card.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-white/85 text-xs font-semibold truncate">{card.name}</p>
                          <span className="text-white/40 text-[10px] font-bold tracking-wider">{card.network}</span>
                        </div>
                        <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: card.progress > 80 ? "linear-gradient(90deg,#10B981,#34D399)" : "linear-gradient(90deg,#F59E0B,#FBBF24)" }}
                            initial={{ width: 0 }}
                            animate={{ width: `${card.progress}%` }}
                            transition={{ delay: 0.7 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${card.progress > 80 ? "text-green-400" : "text-brand-400"}`}>
                        {card.progress}%
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom summary */}
                <motion.div
                  className="glass rounded-xl p-4 flex items-center justify-between"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.95 }}
                >
                  <div>
                    <p className="text-white/40 text-xs mb-1">Total Savings this year</p>
                    <p className="text-white font-extrabold text-2xl">₹2,45,000</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-bold">↑ 34%</p>
                    <p className="text-white/30 text-xs">vs last year</p>
                  </div>
                </motion.div>
              </div>

              {/* Floating AI nudge — CSS float animation, not JS */}
              <motion.div
                className="absolute -bottom-6 -left-10 glass-card rounded-2xl p-4 w-52 shadow-2xl hero-float-slow"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white/90 text-xs font-semibold mb-0.5">AI Tip</p>
                    <p className="text-white/50 text-[10px] leading-relaxed">Pay insurance via Amex — ₹18K away from fee waiver!</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating reward badge — CSS float animation, phase offset */}
              <motion.div
                className="absolute -top-5 -right-8 glass-card rounded-2xl p-4 w-44 shadow-2xl hero-float-fast"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <p className="text-white/35 text-[10px] font-semibold tracking-wider uppercase mb-1">Rewards Earned</p>
                <p className="text-white/95 text-xl font-extrabold">₹1.8L</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-green-400 text-xs font-bold">↑ 12%</span>
                  <span className="text-white/25 text-[10px]">this month</span>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <span className="text-white/20 text-xs tracking-widest uppercase">Scroll</span>
        <div className="scroll-cue-line" />
      </motion.div>
    </section>
  );
}
