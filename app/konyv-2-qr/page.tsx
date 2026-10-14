import type { Metadata } from "next";
import BookRegistryPage from "@/components/book-registry/BookRegistryPage";

export const metadata: Metadata = {
  title: "Vállalhatatlan II. könyvregisztráció",
  description: "A Vállalhatatlan II. kötet megvásárolt példányának regisztrációja.",
  robots: { index: false, follow: false },
};

export default function BookRegistryVolumeTwoPage() {
  return <BookRegistryPage defaultEdition="book_2" lockedEdition />;
}
