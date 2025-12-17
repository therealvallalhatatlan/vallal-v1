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
import { T } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";
import Matricak from "@/components/matricak";

export default function Page() {
  return (
    <main className="text-zinc-200">
      <Navigation />
      <TweetRotator messages={["37 db könyv maradt már csak!","Veronika aki dec.8.-án vásároltál - rossz emailcímet adtál meg, jelentkezz!","Ha postán szeretnéd megkapni jelezz emailben vagy bárhol","A következő batch érkezik a két ünnep között"]} />
      <Hero />
      <CrewCoupon />
      <Matricak />
      <Reviews />
      <MiEz />
      <FAQ />
      <Deliverables />
      <Footer />
    </main>
  );
}
