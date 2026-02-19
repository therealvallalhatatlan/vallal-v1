import type { Metadata } from "next";

import { Container } from "@/components/Container";
import KillSwitchPanel from "@/components/KillSwitchPanel";

export const metadata: Metadata = {
  title: "Kill Switch | Operator Control",
  description: "Operational status console: operator access confirmed and control retained.",
  robots: "noindex",
};

export default function KillSwitchPage() {
  return (
    <Container className="py-10 md:py-14">
      <KillSwitchPanel />
    </Container>
  );
}
