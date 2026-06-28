import { motion } from "motion/react";
import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";

export default function Extension() {
  return (
    <section id="extension" className="relative py-20 md:py-28 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(139,92,246,0.08) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <ScrollReveal>
            <SectionBadge>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              Browser Extension
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Optimise everywhere you{" "}
              <span className="text-gradient">shop online</span>
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto">
              Our Chrome extension automatically detects cart totals on 15+ Indian e-commerce sites and recommends the best card — right on the checkout page.
            </p>
          </ScrollReveal>
        </div>

        {/* Extension Showcase */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Left: Screenshot / Mockup */}
          <ScrollReveal>
            <div className="relative">
              {/* Browser frame */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-white/[0.03] border-b border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <div className="flex-1 mx-3 h-5 rounded-md bg-white/5 flex items-center px-3">
                    <span className="text-[9px] text-white/20 truncate">amazon.in/cart</span>
                  </div>
                  {/* Extension icon in toolbar */}
                  <div className="w-5 h-5 rounded-md bg-accent-500/20 border border-accent-500/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
                {/* Mock content */}
                <div className="p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="h-3 w-24 bg-white/10 rounded mb-1.5" />
                      <div className="h-2 w-16 bg-white/5 rounded" />
                    </div>
                    <div className="text-right">
                      <div className="h-3 w-20 bg-white/10 rounded mb-1.5" />
                      <div className="h-2 w-12 bg-white/5 rounded ml-auto" />
                    </div>
                  </div>
                  {/* Recommendation card mock */}
                  <div className="relative rounded-xl p-4 bg-accent-500/[0.06] border border-accent-500/20 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-accent-500 to-brand-500" />
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-400 bg-accent-500/10 px-2 py-0.5 rounded">Optimal</span>
                    </div>
                    <div className="h-4 w-40 bg-white/10 rounded mb-2" />
                    <div className="h-3 w-56 bg-white/5 rounded mb-3" />
                    <div className="flex items-baseline gap-2 pt-3 border-t border-white/5">
                      <span className="text-xl font-extrabold text-green-400">₹847</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">Expected Reward</span>
                    </div>
                  </div>
                  {/* Floating orb mock */}
                  <div className="flex justify-end">
                    <motion.div
                      className="h-10 px-4 rounded-full glass border border-accent-500/10 flex items-center gap-2 shadow-lg"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <span className="text-sm font-bold text-accent-400">₹847</span>
                      <svg className="w-3.5 h-3.5 text-accent-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: Feature bullets */}
          <ScrollReveal delay={0.15}>
            <div className="space-y-6">
              {[
                {
                  title: "Auto-detects cart totals",
                  desc: "Works on Amazon, Flipkart, Swiggy, Zomato, Myntra, Blinkit, MakeMyTrip, Uber, IRCTC, TataCliq, and 6+ more Indian sites.",
                },
                {
                  title: "One-tap card recommendation",
                  desc: "A floating button appears on checkout pages. Tap it to see which card earns you the most rewards — instantly.",
                },
                {
                  title: "Toggle on/off anytime",
                  desc: "Control the floating button visibility from the extension popup. No clutter when you don't need it.",
                },
                {
                  title: "Same account, everywhere",
                  desc: "Sign in with the same Google account. Your cards, spend history, and preferences sync seamlessly between the mobile app and extension.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-accent-500/10 border border-accent-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                    <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-8 flex items-center gap-4">
              <a
                href="https://chrome.google.com/webstore"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-surface-950 font-semibold text-sm hover:bg-white/90 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" />
                </svg>
                Add to Chrome
              </a>
              <p className="text-white/25 text-xs">Free • No account needed to try</p>
            </div>
          </ScrollReveal>
        </div>

        {/* Supported sites marquee */}
        <ScrollReveal delay={0.3}>
          <div className="mt-16 pt-10 border-t border-white/5">
            <p className="text-center text-white/20 text-xs font-semibold uppercase tracking-widest mb-6">Detects cart totals on</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {["Amazon", "Flipkart", "Swiggy", "Zomato", "Myntra", "Blinkit", "MakeMyTrip", "Uber", "IRCTC", "TataCliq", "BigBasket", "Cleartrip", "Goibibo"].map((site) => (
                <span key={site} className="text-white/15 text-sm font-medium hover:text-white/30 transition-colors">
                  {site}
                </span>
              ))}
              <span className="text-white/10 text-sm font-medium">+ generic cart detection</span>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
