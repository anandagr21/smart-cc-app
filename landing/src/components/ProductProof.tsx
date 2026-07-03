import ScrollReveal from "./ScrollReveal";
import SectionBadge from "./SectionBadge";
import { ZapIcon, WalletIcon, TrendingUpIcon } from "./Icons";

const proofs = [
  {
    title: "Swiggy / Zomato",
    icon: <ZapIcon className="w-5 h-5 text-accent-400" />,
    gradient: "from-accent-500/20 to-brand-500/10",
    scenario: "Food Delivery Order",
    amount: "₹600",
    before: {
      label: "Regular Card",
      card: "HDFC Millennia",
      reward: "1% (₹6)",
      color: "text-white/40",
    },
    after: {
      label: "Best Card",
      card: "Swiggy HDFC",
      reward: "10% (₹60)",
      color: "text-green-400",
    },
    difference: "10× rewards",
  },
  {
    title: "Fuel Fill-Up",
    icon: <WalletIcon className="w-5 h-5 text-brand-400" />,
    gradient: "from-brand-500/20 to-green-500/10",
    scenario: "Petrol Pump",
    amount: "₹2,000",
    before: {
      label: "Regular Card",
      card: "Any Card",
      reward: "1% (₹20)",
      color: "text-white/40",
    },
    after: {
      label: "Best Card",
      card: "IDFC Power Plus",
      reward: "7.5% (₹150)",
      color: "text-green-400",
    },
    difference: "7.5× rewards",
  },
  {
    title: "Fee Waiver Rescue",
    icon: <TrendingUpIcon className="w-5 h-5 text-cyan-400" />,
    gradient: "from-green-500/20 to-cyan-500/10",
    scenario: "Annual Fee Deadline",
    amount: "₹12,500 at risk",
    before: {
      label: "Current Spend",
      card: "₹1,87,000 spent",
      reward: "HDFC Infinia",
      color: "text-white/40",
    },
    after: {
      label: "Waiver Target",
      card: "2 months remaining",
      reward: "₹2,00,000 needed",
      color: "text-brand-400",
    },
    difference: "Save ₹12,500",
  },
];

export default function ProductProof() {
  return (
    <section id="use-cases" className="relative py-20 md:py-28 overflow-hidden">
      {/* Static ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
      />

      <div className="max-w-6xl mx-auto px-6 mb-16">
        <div className="text-center">
          <ScrollReveal>
            <SectionBadge>
              <ZapIcon className="w-3.5 h-3.5" />
              Real Examples
            </SectionBadge>
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
              The right card <span className="text-gradient">pays for itself</span>
            </h2>
            <p className="text-white/40 text-lg max-w-xl mx-auto">
              Real scenarios from Indian credit card users. The math doesn't lie.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6">
          {proofs.map((proof, i) => (
            <ScrollReveal key={proof.title} delay={i * 0.1}>
              <div className="relative glass-card rounded-3xl p-6 md:p-8 h-full flex flex-col group feature-card">
                {/* Background glow pseudo-element */}
                <div
                  className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `linear-gradient(180deg, ${proof.gradient.split(" ")[0]} 0%, transparent 100%)` }}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl glass flex items-center justify-center flex-shrink-0">
                      {proof.icon}
                    </div>
                    <h3 className="text-lg font-bold text-white">{proof.title}</h3>
                  </div>

                  {/* Scenario context */}
                  <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
                    <span className="text-sm font-medium text-white/50">{proof.scenario}</span>
                    <span className="text-lg font-extrabold text-white">{proof.amount}</span>
                  </div>

                  {/* Comparison */}
                  <div className="space-y-6 flex-1 mb-8">
                    {/* Before */}
                    <div>
                      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">{proof.before.label}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white/70">{proof.before.card}</span>
                        <span className={`text-sm font-bold ${proof.before.color}`}>{proof.before.reward}</span>
                      </div>
                    </div>

                    {/* After */}
                    <div>
                      <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-2">{proof.after.label}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{proof.after.card}</span>
                        <span className={`text-sm font-bold ${proof.after.color}`}>{proof.after.reward}</span>
                      </div>
                    </div>
                  </div>

                  {/* Highlight box */}
                  <div className="glass-strong rounded-xl p-4 mt-auto border border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Impact</span>
                    <span className="text-lg font-extrabold text-brand-400">{proof.difference}</span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
