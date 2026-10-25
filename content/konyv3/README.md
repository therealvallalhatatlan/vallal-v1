# Könyv III. bejegyzések

A bejegyzéseket a `data/konyv3Bejegyzesek.ts` fájlban kell regisztrálni. Minden bejegyzéshez hozz létre egy azonos nevű UTF-8 szövegfájlt itt: `{id}.txt`.

## Szükséges adatok

- `id`: URL-biztos azonosító, szóköz nélkül; ezt használja a `/konyv-3/{id}` útvonal.
- `title`: címsor.
- `date`: dátum `YYYY-MM-DD` formátumban.
- `videoSrc`: a nyitány videójának helyi útvonala (például `/videos/konyv3/nyitany.mp4`) vagy közvetlen, böngészőben lejátszható videó-URL.
- `posterSrc`: opcionális borítókép-útvonal.
- `links`: opcionális, bejegyzésenként megjelenő linkek.

A videónak közvetlenül lejátszható médiafájlnak kell lennie. Egy YouTube- vagy Vimeo-oldal URL-je nem helyettesíti az MP4 média-URL-t. Beágyazott videóplatform támogatása külön bővítés lehet.

A szöveg egyszerű szöveg legyen, üres sorokkal a bekezdések között. A tartalomba ne tegyél képeket vagy HTML-t.

Példa az adatjegyzékbe felveendő bejegyzés mezőire:

```ts
{
  id: 'pelda-bejegyzes',
  title: 'A bejegyzés címe',
  date: '2026-10-22',
  videoSrc: '/videos/konyv3/pelda.mp4',
  links: [{ label: 'Kapcsolódó történet', href: '/konyv-2/a-balatonnal' }],
}
```

A fenti példa csak a mezők bemutatására szolgál, nincs aktív bejegyzésként regisztrálva.
