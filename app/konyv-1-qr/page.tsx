import type { Metadata } from "next";
import BookRegistryPage from "@/components/book-registry/BookRegistryPage";

export const metadata: Metadata = {
  title: "Könyvregisztráció | Vállalhatatlan",
  description: "Regisztráld a könyvpéldányodat, kezeld a tulajdonjogot és szabályozd a térképes megjelenítést.",
  robots: { index: false, follow: false },
};

export default function BookRegistryEntryPage() {
  return <BookRegistryPage defaultEdition="book_1" lockedEdition />;
}
