import { motion, useMotionValueEvent, useScroll, AnimatePresence } from "motion/react";
import { useState, useRef } from "react";

const links = [
  { href: "#features",     label: "Features"     },
  { href: "#extension",    label: "Extension"    },
  { href: "#how-it-works", label: "How It Works" },
];

export default function Navbar() {
  const [hidden, setHidden]       = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [scrolled, setScrolled]   = useState(false);
  const prevScrollY = useRef(0);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest: number) => {
    setScrolled(latest > 40);
    if (latest > 120 && latest > prevScrollY.current) setHidden(true);
    else setHidden(false);
    prevScrollY.current = latest;
  });

  return (
    <>
      <motion.nav
        className={`fixed top-4 left-4 right-4 z-50 max-w-6xl mx-auto flex items-center justify-between px-5 py-3 rounded-2xl transition-colors duration-300 ${
          scrolled ? "glass-strong shadow-2xl shadow-black/40" : "glass"
        }`}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: hidden ? -120 : 0, opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group" aria-label="Card Optimizer home">
          <img src="/favicon.png" alt="Card Optimizer" className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/30 group-hover:shadow-brand-500/50 transition-shadow duration-300" />
          <span className="font-bold text-base tracking-tight text-white">Card Optimizer</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-white/55">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative hover:text-white transition-colors duration-200 group"
            >
              {l.label}
              <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gradient-to-r from-brand-400 to-accent-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* CTA + mobile burger */}
        <div className="flex items-center gap-3">
          <a
            href="#cta"
            className="hidden md:inline-flex items-center px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-accent-500/25 hover:shadow-accent-500/40 cursor-pointer"
          >
            Get Early Access
          </a>

          {/* Burger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <motion.span
              className="block w-5 h-0.5 bg-white/70 rounded-full origin-center"
              animate={menuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
            />
            <motion.span
              className="block w-5 h-0.5 bg-white/70 rounded-full"
              animate={menuOpen ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.15 }}
            />
            <motion.span
              className="block w-5 h-0.5 bg-white/70 rounded-full origin-center"
              animate={menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
            />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-x-4 top-20 z-40 glass-strong rounded-2xl p-5 flex flex-col gap-3 max-w-6xl mx-auto md:hidden"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                className="text-white/70 hover:text-white font-medium text-base py-2 px-3 rounded-xl hover:bg-white/5 transition-colors duration-150 cursor-pointer"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </motion.a>
            ))}
            <motion.a
              href="#cta"
              className="mt-1 text-center py-3 bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm rounded-xl transition-colors duration-200 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              onClick={() => setMenuOpen(false)}
            >
              Get Early Access
            </motion.a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
