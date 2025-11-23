// app/reader/page.tsx
import ReaderApp, { Story } from "@/components/ReaderApp";
import fs from "fs";
import path from "path";

const storiesMeta: Omit<Story, "text">[] = [
  {
    id: "01",
    slug: "vizsgalati-jegyzokonyv",
    title: "Vizsgálati jegyzőkönyv",
    readingTime: 3,
    order: 1,
  },
  {
    id: "02",
    slug: "teleki-ter",
    title: "Teleki tér",
    readingTime: 14,
    order: 2,
  },
  // ... ide jön a többi novella meta
];

function loadStoryText(slug: string): string {
  const filePath = path.join(
    process.cwd(),
    "content",
    "stories",
    `${slug}.txt`
  );

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.error("Nem találom a story file-t:", filePath, e);
    return "[Hiányzó szöveg – ellenőrizd a .txt fájlokat]";
  }
}

export default function ReaderPage() {
  const sortedMeta = [...storiesMeta].sort((a, b) => a.order - b.order);

  const stories: Story[] = sortedMeta.map((meta) => ({
    ...meta,
    text: loadStoryText(meta.slug),
  }));

  return (
    <div className="min-h-screen">
      <ReaderApp stories={stories} />
    </div>
  );
}
