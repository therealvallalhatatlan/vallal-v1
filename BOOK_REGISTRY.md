# Könyvpéldány-regiszter

Ez a funkció a régi book_copies készlet-/foglalási rendszertől elkülönülten tartja nyilván a kiadásokat, a nyilvántartási azonosítót, a tulajdonost, az egyszer használatos személyes linkeket és a térképes megosztást.

## Biztonsági és adatmodell-döntések

- Kiadásonként külön sorszámozás fut. A digitális azonosító nem változik tulajdonosváltáskor.
- Az I. kiadásnál az I-001–I-100, a II. kiadásnál a II-001–II-080 tartomány előre le van foglalva a korábbi vásárlóknak. Az új digitális regisztrációk következő sorszáma I-101, illetve II-081.
- A már nyomtatott sorszám külön printed_copy_number mező, nem írja felül a digitális sorszámot.
- A közös QR-kód a belépőoldalra vezet. Bejelentkezve a felhasználó önkiszolgáló módon regisztrálhat egy nála lévő kötetet; a rendszer a következő szabad nyilvántartási azonosítót osztja ki. A korábbi tulajdonosoknak fenntartott I-001–I-100 és II-001–II-080 sorszámok továbbra is csak ellenőrzött, személyes regisztrációs linkkel vehetők át. Az önkiszolgáló regisztráció önbevalláson alapul, nem igazolja a vásárlást.
- A tokenekből csak SHA-256 hash kerül az adatbázisba. A nyers token egyszer jelenik meg az admin-válaszban vagy a vásárlónak küldött e-mail linkben.
- A térképes megosztás alapértelmezetten kikapcsolt. Bekapcsoláskor a pozíció két tizedesjegyre kerekítve tárolódik; tulajdonosváltáskor a régi pont törlődik.
- A táblákhoz a böngészős anon és authenticated szerepkör közvetlen hozzáférése tiltott. Az API a szerveroldali service role-on keresztül olvas/ír, és az aktuális Auth-felhasználót minden művelet előtt ellenőrzi.
- A régi numbered_copy fizetési folyamat nem hoz létre automatikusan új digitális sorszámot, amíg a régi fizikai sorszámokkal való megfeleltetés nincs auditálva.

## Migráció

A db/migrations/054_book_registry.sql additív migráció. Új táblákat, korlátozásokat, RLS-policy-ket és tranzakciós RPC-ket hoz létre; a régi book_copies táblát nem módosítja. A db/migrations/056_book_registry_self_service.sql adja hozzá az atomikus önkiszolgáló sorszámkiosztást.

1. Először ellenőrizd, hogy az aktuális main ágon nincs-e ütköző 054_...sql migráció.
2. Készíts adatbázis-mentést.
3. A migrációt a pull request átnézése után, kézzel futtasd a megfelelő Supabase projekt SQL Editorában. A fejlesztési ág önmagában nem futtatja le.
4. Ellenőrizd, hogy a book_editions két kiadást tartalmaz-e, és a book_registry_copies táblában 100 darab book_1 és 80 darab book_2 awaiting_claim sor van-e.
5. Ellenőrizd, hogy a régi book_copies sorai, státuszai és a Stripe-foglalási folyamat változatlanok maradtak-e.

Ne futtasd ezt a migrációt a másik, illusztrációs Supabase-projekten.

## Végpontok

| Végpont | Művelet | Mire való |
|---|---|---|
| GET /api/book-registry/register | Bejelentkezett felhasználó | A következő javasolt nyilvántartási azonosító lekérése |
| POST /api/book-registry/register | Bejelentkezett felhasználó | Saját könyvpéldány önkiszolgáló regisztrációja, atomikus sorszámkiosztással |
| POST /api/book-registry/claim | Bejelentkezett felhasználó | Személyes regisztrációs link beváltása előre fenntartott / vásárláshoz kötött példányhoz |
| GET /api/book-registry/mine | Bejelentkezett felhasználó | Saját regisztrált példányok |
| PATCH /api/book-registry/location | Tulajdonos | Hozzávetőleges térképpont mentése vagy törlése |
| GET /api/book-registry/map | Nyilvános, szűkített adat | Csak regisztrált és térképes megjelenítéshez hozzájárult példányok |
| POST /api/book-registry/transfer | Tulajdonos | Hét napig érvényes egyszer használatos átadási link készítése |
| PATCH /api/book-registry/transfer | Bejelentkezett átvevő | Tulajdonosváltás elfogadása |
| POST /api/admin/book-registry/entitlements | Admin | Egyszer használatos jogosultság kibocsátása vagy még fel nem használt jogosultság visszavonása |

Minden író végpont tiszteletben tartja a middleware READ_ONLY módját. A publikus térképválasz nem tartalmaz e-mail-címet, rendelésazonosítót vagy Auth-felhasználóazonosítót.

## Korábbi vásárlók jogosultságának kiadása

Az admin végponthoz Authorization: Bearer <Supabase access token> fejléc és adminisztrátori e-mail kell.

Példakérés korábbi, fizikailag azonosított példányhoz:

    {
      "editionCode": "book_1",
      "sourceType": "historical",
      "historicalSerial": 42,
      "sourceReference": "ellenorzott-regi-rendeles-azonosito",
      "expiresInDays": 30
    }

A historicalSerial csak a fenntartott tartományba eső, még le nem foglalt történelmi sorszám lehet. Az expiresInDays opcionális, 1–90 napos lejáratot állít; kihagyásakor a kód nem jár le. Előbb egyeztesd, hogy a vásárló valóban azt a példányt kapta-e. Az API válaszában lévő claimUrl személyes jogosultság, csak a megfelelő tulajdonosnak továbbítsd.

Még fel nem használt kód visszavonása:

    {
      "action": "revoke",
      "entitlementId": "<jogosultsag-UUID>"
    }

A beváltott kód nem vonható vissza ezzel az útvonallal. A lejárt vagy elveszett linket vissza kell vonni, majd új, ellenőrzött jogosultságot kell kiadni. A régi történelmi sorszámot nem szabad egy másik embernek kiosztani, amíg a fizikai példány tulajdonjoga nincs tisztázva.

## Automatikus jogosultság vásárlás után

A Stripe webhook fizetett Checkout Session esetén hoz létre jogosultságot, ha a Checkout Session metadata tartalmazza a book_registry_edition mezőt book_1 vagy book_2 értékkel. A II. kiadás felismerhető a book_ii, book_2, book-2 vagy book-ii product_id/orderType/type azonosítóból is.

A Stripe Payment Link/Checkout Session metadata beállítását külön ellenőrizd a Stripe Dashboardban. A termék metaadata nem feltétlenül azonos a Checkout Session metaadataival. Ne állítsd be a book_registry_edition=book_1 mezőt a régi numbered_copy folyamaton: a régi fizikai sorszámok egyeztetéséig ezt a webhook szándékosan kihagyja.

Az e-mail-kiküldéshez a már használt RESEND_API_KEY és EMAIL_FROM környezeti változók szükségesek. Ha a jogosultság e-mailje nem megy ki, a webhook naplózza az esetet; a fizetett rendelés adatait ellenőrizve adj ki pótkódot az admin végponton.

## Ellenőrzési lista

- [ ] A migráció előtt mentés és a célprojekt ellenőrzése
- [ ] I-001–I-100 és II-001–II-080 lefoglalása
- [ ] I-101 és II-081 az első nem történelmi digitális sorszám
- [ ] Ugyanaz a jogosultsági kód második beváltáskor elutasítva
- [ ] Két párhuzamos új regisztráció nem kaphat azonos sorszámot
- [ ] Másik felhasználó példánya/helye nem szerkeszthető
- [ ] Kikapcsolt térképpont nem jelenik meg a publikus API-ban
- [ ] Tulajdonosváltás után a régi pont törlődik, a régi tulajdonos elveszíti a szerkesztési jogot
- [ ] Lejárt, visszavont vagy már használt átadási link elutasítva
- [ ] Stripe webhook retry nem hoz létre duplikált jogosultságot
- [ ] Régi book_copies tábla és checkout viselkedése változatlan
- [ ] pnpm test:book-registry és a production build sikeres
