import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import MainContent from "@/components/MainContent";
import HeroTerminal from "@/components/HeroTerminal";

export default function Page() {
  return (
    <MainContent>
      <Navigation />
      <HeroTerminal />
      <Footer />
    </MainContent>
  );
}

