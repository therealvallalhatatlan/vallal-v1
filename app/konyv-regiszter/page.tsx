import type { Metadata } from "next";
import BookRegistryPage from "@/components/book-registry/BookRegistryPage";

export const metadata: Metadata = {
  title: "Saját könyveim | Vállalhatatlan",
  description: "Kezeld a regisztrált Vállalhatatlan könyvpéldányaidat, a térképes megosztást és a tulajdonosváltást.",
  robots: { index: false, follow: false },
};

export default function MyBookRegistryPage() {
  return <BookRegistryPage />;
}
