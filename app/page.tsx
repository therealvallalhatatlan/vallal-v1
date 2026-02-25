import Hero from "@/components/Hero";
import MiEz from "@/components/MiEz";
import DeadDropHow from "@/components/DeadDropHow";
import Shipping from "@/components/Shipping";
import Reviews from "@/components/Reviews";
import MapSection from "@/components/MapSection";
import Deliverables from "@/components/Deliverables";
import MethodSelect from "@/components/MethodSelect";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import BookCover from "@/components/BookCover";
import CtaBuyBox from "@/components/CtaBuyBox";
import TweetRotator from "@/components/TweetRotator";
import Navigation from "@/components/Navigation";
import CrewCoupon from "@/components/CrewCoupon";
import Matricak from "@/components/matricak";
import OlvassBele from "@/components/OlvassBele";
import BookCounter from "@/components/BookCounter";

export default function Page() {
  return (
    <main className="text-zinc-200">
      <TweetRotator messages={["Készlet feltöltve - akár pár órán belül megkaphatod!","Nyugodtan baszogass, írj rám!","therealvallalhatatlan@gmail.com", "Veronika aki dec.8.-án vásároltál - még mindig nem jelentkeztél!","Nem csak dead drop - postán is kérhető, automatába"]} />
      <Navigation />
      <Hero />
      <Reviews />
      <OlvassBele />
      <MiEz />
      <FAQ />
      <Deliverables />
      <Footer />
    </main>
  );
}
