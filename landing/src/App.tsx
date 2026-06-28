import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import ProductProof from "./components/ProductProof";
import Extension from "./components/Extension";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

const TICKER_ITEMS = [
  "HDFC Infinia", "Amex Platinum", "Axis Magnus", "SBI Cashback",
  "ICICI Coral", "Kotak League", "HDFC Regalia", "Yes First",
  "Flipkart Axis", "Amazon Pay ICICI", "BoB Premier", "AU LIT",
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
            className="inline-flex items-center gap-3 px-4 text-xs font-semibold text-white/25 uppercase tracking-widest whitespace-nowrap"
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
      <Hero />
      <TickerStrip />
      <Features />
      <ProductProof />
      {/* <Extension /> */}
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}
