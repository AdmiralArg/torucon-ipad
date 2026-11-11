# Torucon iPad-loop

Animerte skjermer for Torucon-standen på SpillExpo: Om Torucon, programsøknad 2027, merch og Cyberdrive 2027.
Laget som en nettside som oppfører seg som en app (PWA), så den kjører i fullskjerm og uten nett etter første åpning.

## Sette opp en iPad

1. Åpne adressen i Safari på iPaden.
2. Trykk Del og så **Legg til på Hjem-skjerm**.
3. Åpne Torucon-ikonet på Hjem-skjermen, og velg hva iPaden skal vise: loop av alle skjermene eller én fast skjerm.
   Valget huskes på hver iPad.
4. Sett **Innstillinger > Skjerm og lysstyrke > Autolås** til **Aldri**.
5. Slå på **Innstillinger > Tilgjengelighet > Veiledet tilgang**, åpne appen og trippelklikk sideknappen.
   Da kan ikke besøkende gå ut av appen.

Hold fingeren på skjermen i 3 sekunder for å komme tilbake til menyen.

## Endre innhold

- Tekst står i `index.html`.
- Bilder ligger i `assets/img`, eksportert fra Figma.
- Cyberdrive-animasjonen i `css/cyber.css` er generert fra keyframesene i Figma-rammen «Torucon: Cyberdrive 2027 — BG Loop».
- Øk `VERSION` i `sw.js` etter endringer, så henter iPadene ny versjon neste gang de er på nett.

Alt er tegnet i 2048x2732 (iPad Pro 12.9 stående). Bakgrunnen fyller hele skjermen, og innholdet skaleres så det alltid får plass,
også på mindre iPader og liggende.
