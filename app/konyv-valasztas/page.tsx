import { Container } from '@/components/Container';
import { CopyReservationApp } from '@/components/CopyReservationApp';
import Navigation from "@/components/Navigation";

export const metadata = {
  title: 'Válaszd ki a számozott példányodat - Vállalhatatlan',
  description: 'Válaszd ki a Vállalhatatlan számozott limitált kiadású példányát',
};

export default function CopySelectionPage() {
  return (
    <main className="py-12 md:py-16">
      <Container>
        <Navigation />
        <CopyReservationApp />
      </Container>
    </main>
  );
}
