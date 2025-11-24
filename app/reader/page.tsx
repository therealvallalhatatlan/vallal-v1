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
    slug: "jezus-megszoktet",
    title: "Jézus megszöktet a rehabról",
    readingTime: 14,
    order: 2,
  },
   {
    id: "03",
    slug: "k-hole",
    title: "K-hole a teleki téren",
    readingTime: 14,
    order: 3,
  },
   {
    id: "04",
    slug: "utazas-fuegyhazara",
    title: "Utazás Fűegyházára",
    readingTime: 14,
    order: 4,
  },
   {
    id: "05",
    slug: "tartozunk-egy-ukrannak",
    title: "Tartozunk egy ukránnak",
    readingTime: 14,
    order: 5,
  },
   {
    id: "06",
    slug: "negyedkilo-heroin",
    title: "negyedkiló heroin",
    readingTime: 6,
    order: 6,
  },
     {
    id: "07",
    slug: "bosnyak-ter",
    title: "Bosnyák tér",
    readingTime: 6,
    order: 7,
  },
     {
    id: "08",
    slug: "ibolya-presszo",
    title: "Ibolya Presszo",
    readingTime: 6,
    order: 8,
  },
   {
    id: "09",
    slug: "elso-nap",
    title: "Első nap a paradicsomban",
    readingTime: 6,
    order: 9,
  },
   {
    id: "10",
    slug: "mersekelten-hires",
    title: "A mérsékelten híres rapper",
    readingTime: 6,
    order: 10,
  },
   {
    id: "11",
    slug: "bortonbe-kerulok",
    title: "Börtönbe kerülök",
    readingTime: 6,
    order: 11,
  },
  {
    id: "12",
    slug: "agressziv-laci",
    title: "agresszív Laci",
    readingTime: 8,
    order: 12,
  },
  {
    id: "13",
    slug: "after",
    title: "Afterállatkák",
    readingTime: 8,
    order: 13,
  },
    {
    id: "14",
    slug: "sose-bizz",
    title: "Sose bízz egy herkásban",
    readingTime: 8,
    order: 14,
  },
    {
    id: "15",
    slug: "fefe",
    title: "Fefe elromlott cerkája",
    readingTime: 8,
    order: 15,
  },
    {
    id: "16",
    slug: "kirandulas",
    title: "Kirándulás a Marsra",
    readingTime: 11,
    order: 16,
  },
    {
    id: "17",
    slug: "leharapott",
    title: "a leharapott hüvelykujj",
    readingTime: 11,
    order: 17,
  },
    {
    id: "18",
    slug: "pucer",
    title: "A pucér nyaralás",
    readingTime:9,
    order: 18,
  },
    {
    id: "19",
    slug: "vori",
    title: "Vöri és a mentőstáska",
    readingTime:9,
    order: 19,
  },
      {
    id: "20",
    slug: "elgazolom",
    title: "Elgázolom az egyik vásárlómat",
    readingTime:9,
    order: 20,
  },
        {
    id: "21",
    slug: "holnaptol",
    title: "Holnaptól leállok",
    readingTime:9,
    order: 21,
  },
        {
    id: "22",
    slug: "szelvedo",
    title: "Szélvédő nélkül",
    readingTime:16,
    order: 22,
  },
          {
    id: "23",
    slug: "stazi",
    title: "Stázi",
    readingTime:16,
    order: 23,
  },
            {
    id: "24",
    slug: "csernus",
    title: "dr. Csernus rámbassza a telefont",
    readingTime:16,
    order: 24,
  },
              {
    id: "25",
    slug: "atropina-1",
    title: "Atropina Belladonna 1",
    readingTime:16,
    order: 25,
  },
  {
    id: "26",
    slug: "atropina-2",
    title: "Atropina Belladonna 2",
    readingTime:16,
    order: 26,
  },
  {
    id: "27",
    slug: "atropina-3",
    title: "Atropina Belladonna 3",
    readingTime:16,
    order: 27,
  },
    {
    id: "28",
    slug: "atropina-4",
    title: "Atropina Belladonna 4",
    readingTime:16,
    order: 28,
  },
      {
    id: "29",
    slug: "hatodik",
    title: "Hatodik nap a zárt osztályon",
    readingTime:16,
    order: 29,
  },
        {
    id: "30",
    slug: "private",
    title: "Private link netcafé",
    readingTime:16,
    order: 30,
  },
  // ... a többi novella
];

function loadStoryText(slug: string): string {
  const filePath = path.join(process.cwd(), "content", "stories", `${slug}.txt`);

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (e) {
    console.error("Nem találom a story file-t:", filePath, e);
    return "[Hiányzó szöveg – ellenőrizd a .txt fájlokat]";
  }
}

export default async function ReaderPage() {
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
