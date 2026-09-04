import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader, SiteFooter, BetaBanner, Section, PillButton } from "@/components/brand";
import Landing from "@/pages/Landing";
import CheckPage from "@/pages/Check";
import EvaluationPage from "@/pages/Evaluation";
import Methodology from "@/pages/Methodology";
import HowItWorks from "@/pages/HowItWorks";
import DataSafety from "@/pages/DataSafety";
import Disputes from "@/pages/Disputes";
import About from "@/pages/About";
import Terms from "@/pages/Terms";
import { PasswordGate, useGateSession } from "@/components/input/PasswordGate";
import { GATE_ENABLED } from "@/lib/config";

/** Reset scroll on route change (browser default only handles history nav). */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <Section tone="cream" className="min-h-[50vh]">
      <h1 className="font-serif text-4xl font-bold">Page not found</h1>
      <p className="mt-4 max-w-xl text-lg leading-relaxed">
        This page does not exist. If you followed a report link, the report
        may have expired. Reports are kept for about 90 days, then deleted.
      </p>
      <div className="mt-8">
        <PillButton to="/">Back to the start</PillButton>
      </div>
    </Section>
  );
}

export default function App() {
  const gate = useGateSession(GATE_ENABLED);
  if (!gate.ready) return null;
  if (!gate.unlocked) return <PasswordGate />;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-pill bg-brand-cobalt px-6 py-2.5 font-sans font-bold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <SiteHeader />
      <BetaBanner />
      <main id="main" className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/check" element={<CheckPage />} />
          <Route path="/r/:id" element={<EvaluationPage />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/your-data" element={<DataSafety />} />
          <Route path="/disputes" element={<Disputes />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <SiteFooter />
    </div>
  );
}
