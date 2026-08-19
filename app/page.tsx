import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MainContent from "@/components/MainContent";
import HeroTerminal from "@/components/HeroTerminal";
import HomeActiveSpotsSection from "@/components/HomeActiveSpotsSection";
import TopCta from "@/components/TopCta";

export default function Page() {
  return (
    <MainContent>
      <Navigation />
      <TopCta />
      <HeroTerminal />
      <HomeActiveSpotsSection />
      <Footer />
    </MainContent>
  );
}

