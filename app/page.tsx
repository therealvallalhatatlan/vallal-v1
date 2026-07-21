import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MainContent from "@/components/MainContent";
import HeroTerminal from "@/components/HeroTerminal";
import HomeActiveSpotsSection from "@/components/HomeActiveSpotsSection";

export default function Page() {
  return (
    <MainContent>
      <Navigation />
      <HomeActiveSpotsSection />
      <HeroTerminal />
      <Footer />
    </MainContent>
  );
}

