// ARCHIVE: homepage before the 2026-10-01 personalized homepage redesign.
// Restoring this file's contents to app/page.tsx reverts the page-level composition.
// The original VallalhatatlanHero2 component remains in components/VallalhatatlanHero2.tsx.

import MainContent from "@/components/MainContent";
import VallalhatatlanHero2 from "@/components/VallalhatatlanHero2";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <MainContent>
      <VallalhatatlanHero2 />
      <Footer />
    </MainContent>
  );
}
