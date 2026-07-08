import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import HowItWorks from "./components/HowItWorks";
import ProductProof from "./components/ProductProof";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import PrivacyPage from "./components/PrivacyPage";
import DeleteDataPage from "./components/DeleteDataPage";

export default function App() {
  const path = window.location.pathname;

  if (path === "/privacy") {
    return <PrivacyPage />;
  }

  if (path === "/delete-data") {
    return <DeleteDataPage />;
  }

  return (
    <div className="font-sans bg-surface-950 text-white antialiased overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <ProductProof />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
