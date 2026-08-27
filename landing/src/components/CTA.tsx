import { motion } from "motion/react";
import ScrollReveal from "./ScrollReveal";
import { ArrowRightIcon } from "./Icons";
import { GOOGLE_PLAY_URL_CTA } from "../constants";

export default function CTA() {
  return (
    <section id="cta" className="relative py-20 md:py-28 overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <ScrollReveal>
          <div className="cta-card relative rounded-3xl overflow-hidden">
            {/* Static gradient bg layers — no animated blur filters */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.16) 0%, rgba(245,158,11,0.08) 50%, rgba(139,92,246,0.10) 100%)" }}
            />
            {/* Subtle dot grid */}
            <div className="absolute inset-0 bg-dot opacity-30" />
            {/* Static glow blobs — radial-gradient only, zero JS */}
            <div
              className="absolute top-0 left-1/4 w-64 h-64 rounded-full pointer-events-none cta-orb-left"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)" }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full pointer-events-none cta-orb-right"
              style={{ background: "radial-gradient(circle, rgba(245,158,11,0.30) 0%, transparent 70%)" }}
            />
            {/* Thin glass border */}
            <div className="absolute inset-0 rounded-3xl" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />

            {/* Content */}
            <div className="relative px-8 py-14 md:px-16 md:py-16 text-center">
              {/* Badge */}
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-full mb-5 cta-badge"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <span className="relative w-2 h-2">
                  <span className="relative block w-2 h-2 rounded-full bg-brand-500" />
                </span>
                Now Live on Google Play
              </motion.div>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
                Which card should you use for{" "}
                <span className="text-gradient">tonight's Swiggy order?</span>
              </h2>
              <p className="text-white/50 text-lg max-w-lg mx-auto mb-10">
                Stop guessing and start analysing your own wallet.
                Install on Android — free during early access.
              </p>

              <a
                href={GOOGLE_PLAY_URL_CTA}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-btn inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-bold text-base rounded-xl transition-all duration-200 cursor-pointer"
              >
                Get It on Google Play
                <ArrowRightIcon className="w-4 h-4" />
              </a>

              <p className="text-white/20 text-xs mt-5">
                Free during early access · No bank linking · Setup takes 2 minutes
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
