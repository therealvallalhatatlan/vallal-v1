// Removed legacy header and footer for homepage; using hero-contained navigation
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

