import Navigation from "@/components/Navigation";
import MecenasApp from "@/components/MecenasApp";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mecénás – Vállalhatatlan",
  description: "Támogasd a Vállalhatatlan projektet egy tetszőleges összeggel.",
};

export default function MecenasPage() {
  return (
    <main className="text-zinc-900">
      <Navigation />
      <MecenasApp />
    </main>
  );
}
