# Vitvarukollen 3.1

PWA för disk, tvätt och tork: kvartspriser SE3 omräknade till ert totalpris (Telinet + Ellevio + energiskatt + moms).

## Publicera gratis från mobilen (GitHub Pages)
1. github.com → **New repository** → namn `vitvarukollen` → Public → Create.
2. **Add file → Upload files** → välj alla filer i den här mappen (inte mappen själv) → Commit.
3. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save.
4. Efter ca 1 min: `https://<ditt-användarnamn>.github.io/vitvarukollen/`
5. Öppna länken → Chrome: ⋮ → *Lägg till på startskärmen* (iPhone: Dela → *Lägg till på hemskärmen*).

## Första gången
- **Inställningar → Maskiner**: kontrollera på panelen om varje maskin räknar tid till *start* (+h) eller till *klar* (Klar om). Standard: disk = start, tvätt/tork = klar.
- **Dela länk** → skicka till den andra telefonen → öppna → *Importera*. Gör det *i den installerade appen* (eller installera efter att du importerat i samma webbläsare). Fungerar inte länken: *Klistra in delningslänk*.

## Filer
- `index.html` – vyer och stil
- `app.js` – priser, cache, kostnadsmotor, tips, inställningar
- `appliances.js` – Bosch-katalogen (kWh, tider, kvartsvikter) – redigera här eller under Inställningar
- `manifest.webmanifest`, `sw.js`, `icon-*.png` – installation och offline

## Bra att veta
- Om priserna inte kan hämtas visar appen **Demodata** (röd prick). Tryck ↻ för att försöka igen.
- Elpriser tillhandahålls av Elpriset just nu.se.
- Ändrar du filerna: höj `CACHE` i `sw.js` (t.ex. `vk-3.1.1`) så att telefonerna hämtar den nya versionen.
