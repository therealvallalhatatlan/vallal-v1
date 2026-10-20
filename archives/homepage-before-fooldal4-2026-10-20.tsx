// ARCHIVE: root homepage before switching the site homepage to /fooldal-4 (2026-10-20).
// Restore this file's contents to app/page.tsx to bring back the previous homepage.

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
