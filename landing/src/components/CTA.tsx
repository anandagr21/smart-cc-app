import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import ScrollReveal from "./ScrollReveal";
import { ArrowRightIcon } from "./Icons";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function CTA() {
  const [email, setEmail]       = useState("");
  const [status, setStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setErrorMsg("");

    if (!API_URL) {
      setErrorMsg("API is not configured. Please try again later.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/waitlist/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const body = await res.text();
        console.error("Failed to join waitlist:", body);
        setErrorMsg(
          res.status === 429
            ? "Too many attempts. Please wait a moment and try again."
            : "Something went wrong. Please try again."
        );
        setStatus("error");
      }
    } catch (err) {
      console.error("Network error:", err);
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

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
                  <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-75" />
                  <span className="relative block w-2 h-2 rounded-full bg-brand-500" />
                </span>
                Limited Early Access — Spots Filling Fast
              </motion.div>

              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
                Start optimizing your{" "}
                <span className="text-gradient">cards today.</span>
              </h2>
              <p className="text-white/50 text-lg max-w-lg mx-auto mb-10">
                Join 2,000+ cardholders already saving on fees and maximising rewards.
                Early access is free — no credit card needed.
              </p>

              {status === "error" && (
                <motion.div
                  key="error"
                  className="rounded-xl p-4 max-w-md mx-auto mb-4"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.25)" }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                </motion.div>
              )}

              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div
                    key="success"
                    className="cta-success-card rounded-2xl p-8 max-w-md mx-auto"
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <motion.div
                      className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-4"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 280, delay: 0.1 }}
                    >
                      <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                    <p className="text-white font-bold text-xl mb-1">You're on the list!</p>
                    <p className="text-white/45 text-sm">
                      We'll reach out at{" "}
                      <span className="text-brand-400 font-semibold">{email}</span> soon.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <label htmlFor="cta-email" className="sr-only">Email address</label>
                    <input
                      id="cta-email"
                      type="email"
                      placeholder="Enter your email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1 px-5 py-4 cta-input rounded-xl text-white placeholder-white/30 focus:outline-none transition-colors duration-200 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="cta-btn px-7 py-4 text-white font-bold text-sm rounded-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {status === "loading" ? (
                        <>
                          <span className="cta-spinner" />
                          Joining...
                        </>
                      ) : (
                        <>
                          Get Early Access
                          <ArrowRightIcon className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-white/20 text-xs mt-5">
                No spam. Unsubscribe anytime. We'll never share your email.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
