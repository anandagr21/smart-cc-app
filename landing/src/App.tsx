import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import ProductProof from "./components/ProductProof";
import Extension from "./components/Extension";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

const TICKER_ITEMS = [
  "HDFC Infinia", "Amex Platinum Travel", "HSBC Live+", "SBI Cashback",
  "ICICI Amazon Pay", "IDFC Power Plus", "HDFC Marriott", "Axis Flipkart",
  "Scapia", "Kiwi RuPay", "BOB Eterna", "Kotak 811",
];

// Single ticker strip between major sections — one animation at a time
function TickerStrip() {
  // Double items for seamless loop
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="relative py-3.5 border-y border-white/5 overflow-hidden bg-white/[0.015]">
      <div
        className="absolute left-0 inset-y-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(90deg, #020617, transparent)" }}
      />
      <div
        className="absolute right-0 inset-y-0 w-20 z-10 pointer-events-none"
        style={{ background: "linear-gradient(-90deg, #020617, transparent)" }}
      />
      <div className="ticker-track gap-0">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 px-4 text-xs font-semibold text-white/45 uppercase tracking-widest whitespace-nowrap"
          >
            {item}
            <span className="w-1 h-1 rounded-full bg-white/15" />
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="font-sans bg-surface-950 text-white antialiased overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <TickerStrip />
        <Features />
        <ProductProof />

      {/* Social Proof Bar — real user outcomes in Reddit-style "category → card → savings" format */}
      <section className="relative py-12 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="glass-card rounded-2xl p-8">
            <p className="text-center text-white/45 text-xs font-semibold uppercase tracking-widest mb-8">
              Trusted by 2,000+ Indian cardholders
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { category: "Food Delivery", card: "Swiggy HDFC", result: "₹540/month saved", color: "text-accent-400" },
                { category: "Fuel", card: "IDFC Power Plus", result: "₹1,200/month saved", color: "text-brand-400" },
                { category: "Annual Fee", card: "HDFC Infinia", result: "₹12,500 fee waived", color: "text-green-400" },
              ].map((item) => (
                <div key={item.category} className="text-center">
                  <p className="text-white/45 text-xs uppercase tracking-wider mb-1">{item.category}</p>
                  <p className="text-white font-semibold text-sm mb-1">{item.card}</p>
                  <p className={`text-lg font-extrabold ${item.color}`}>{item.result}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* <Extension /> */}
      <HowItWorks />
      <CTA />
      </main>
      <Footer />
    </div>
  );
}
