import { Container } from '@/components/Container';
import { CopyReservationApp } from '@/components/CopyReservationApp';

export const metadata = {
  title: 'Válaszd ki a számozott példányodat - Vállalhatatlan',
  description: 'Válaszd ki a Vállalhatatlan számozott limitált kiadású példányát',
};

export default function CopySelectionPage() {
  return (
    <main className="relative py-12 md:py-16">
      <div className="pointer-events-none absolute inset-0 bg-black/70" />
      <Container className="relative z-10">
        <CopyReservationApp />
      </Container>
    </main>
  );
}
