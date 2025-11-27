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

export default function Page() {
  return (
    <main className="text-zinc-200">
      <Navigation />  
      <Hero />
      <Reviews />
      <MiEz />
      <FAQ />
      <Deliverables />
      <Footer />
    </main>
  );
}
