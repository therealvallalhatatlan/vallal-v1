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

export default function Page() {
  return (
    <main className="text-zinc-200">
      <TweetRotator messages={["Veronika aki dec.8.-án vásároltál - rossz emailcímet adtál meg, jelentkezz!","Ha postán szeretnéd megkapni jelezz emailben vagy bárhol"]} />
      <Hero />
      <CrewCoupon />
      <Reviews />
      <MiEz />
      <FAQ />
      <Deliverables />
      <Footer />
    </main>
  );
}
