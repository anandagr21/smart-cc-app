import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";
import { StarIcon } from "./Icons";

const testimonials = [
  {
    initials: "RK",
    name: "Rahul K.",
    cards: "HDFC Infinia · Amex Plat · SBI Elite",
    quote: "I carry 12 cards and was losing track of renewal dates and fee thresholds. Smart CC saved me ₹45,000 in annual fees this year alone. The AI recommendations are scarily accurate.",
    gradient: "from-accent-500 to-brand-500",
    savings: "₹45,000",
    savingsLabel: "fees saved",
  },
  {
    initials: "PM",
    name: "Priya M.",
    cards: "Amex Platinum · Axis Magnus",
    quote: "The milestone tracking is a game-changer. I was about to pay ₹10K renewal on my Amex when Smart CC showed me I was just ₹30K away from the waiver. Pushed my insurance payment — fee waived!",
    gradient: "from-brand-500 to-green-500",
    savings: "₹10,000",
    savingsLabel: "waiver saved",
  },
  {
    initials: "AD",
    name: "Arjun D.",
    cards: "SBI Cashback · HDFC Diners Black",
    quote: "As a freelancer with variable income, I was using the wrong card for everything. Smart CC showed me I was leaving ₹8K/month in rewards on the table. Worth every rupee.",
    gradient: "from-green-500 to-cyan-500",
    savings: "₹96,000",
    savingsLabel: "recovered / year",
  },
  {
    initials: "SK",
    name: "Sneha K.",
    cards: "HDFC Regalia · Axis Reserve",
    quote: "Finally an app that speaks my language. The spend category breakdown combined with AI card suggestions is exactly what heavy spenders need.",
    gradient: "from-rose-500 to-accent-500",
    savings: "₹28,000",
    savingsLabel: "rewards unlocked",
  },
  {
    initials: "VR",
    name: "Vikram R.",
    cards: "Amex Plat · HDFC Infinia · BoB Premier",
    quote: "Travel hacking with multiple cards was a nightmare to manage. Smart CC's lounge & milestone tracker keeps me on top of every benefit. Pays for itself in the first month.",
    gradient: "from-cyan-500 to-brand-500",
    savings: "₹60,000",
    savingsLabel: "travel benefits",
  },
  {
    initials: "NP",
    name: "Neha P.",
    cards: "ICICI Amazon Pay · Flipkart Axis",
    quote: "Running an online business means huge spends every month. Smart CC showed me the exact split that maximises cashback across merchants. The ROI is insane — easily 100× the cost.",
    gradient: "from-accent-500 to-cyan-400",
    savings: "₹1.2L",
    savingsLabel: "cashback earned",
  },
];

const Stars = () => (
  <div className="flex gap-0.5 mb-3">
    {[...Array(5)].map((_, i) => (
      <StarIcon key={i} className="w-3.5 h-3.5 text-brand-400" />
    ))}
  </div>
);

// Duplicate for seamless loop
const all = [...testimonials, ...testimonials];

export default function Testimonials() {
  return (
    <section id="testimonials" className="relative py-20 md:py-28 overflow-hidden">
      {/* Static ambient glow — no animation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% 100%, rgba(139,92,246,0.05) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 mb-12">
        <div className="text-center">
          <ScrollReveal>
            <SectionBadge>
              <StarIcon className="w-3.5 h-3.5" />
              Trusted by Card Enthusiasts
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              What our <span className="text-gradient">users say</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Real cardholders. Real savings. No fluff.
            </p>
          </ScrollReveal>
        </div>
      </div>

      {/* Marquee — NO backdrop-filter on inner cards (24 blurred elements = biggest perf killer) */}
      <div className="relative overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(90deg, #020617, transparent)" }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
          style={{ background: "linear-gradient(-90deg, #020617, transparent)" }}
        />

        <div className="marquee-track gap-4 px-4">
          {all.map((t, i) => (
            <div
              key={`${t.name}-${i}`}
              className="testimonial-card w-80 flex-shrink-0 cursor-default"
            >
              <Stars />
              <p className="text-white/65 text-sm leading-relaxed mb-4 line-clamp-4">"{t.quote}"</p>

              {/* Savings badge — solid bg, no blur */}
              <div className="savings-badge rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-white/40 text-xs">{t.savingsLabel}</span>
                <span className="text-green-400 font-extrabold text-sm">{t.savings}</span>
              </div>

              <div className="flex items-center gap-3 border-t border-white/8 pt-4">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center font-bold text-xs text-white flex-shrink-0`}>
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.name}</p>
                  <p className="text-xs text-white/30 truncate">{t.cards}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Aggregate stat bar */}
      <ScrollReveal delay={0.1}>
        <div className="max-w-4xl mx-auto px-6 mt-12">
          {/* Solid bg — no backdrop-filter */}
          <div className="stat-bar rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "2,000+", label: "Active users" },
              { value: "₹4.2Cr", label: "Total fees saved" },
              { value: "4.9 ★",  label: "App rating" },
              { value: "98%",    label: "Retention rate" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-white/35 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
