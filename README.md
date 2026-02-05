# Häivä – band site

Frontend-only band site for **Häivä**, domain [haiva.art](https://haiva.art).

## Stack

- **Astro** + **TypeScript**
- No database, no auth, no server — static frontend only

## Features

- **Aurora borealis background** — canvas-drawn, with mouse movement parallax on desktop and touch support on mobile
- **Simple header** — logo + Finnish main nav (Meistä, Tapahtumat, Äänimuotokuva, Valotyö, Yhteystiedot); hamburger menu on small screens
- **Minimal footer** — right-aligned © year + brand + "Sivusto tehty rakkaudella Tampereella"
- **Placeholder sections** — hero, about text, Spotify embed area, image gallery, contact

## Commands

| Command           | Action                          |
| ----------------- | -------------------------------- |
| `npm install`     | Install dependencies             |
| `npm run dev`     | Start dev server (e.g. :4321)     |
| `npm run build`   | Build for production to `./dist` |
| `npm run preview` | Preview production build         |

## Project structure

```
src/
├── components/
│   ├── AuroraBackground.astro   # Aurora canvas + mouse/touch parallax
│   ├── Header.astro             # Logo + nav + mobile menu
│   └── Footer.astro             # Minimal footer text
├── layouts/
│   └── BaseLayout.astro         # Layout with aurora, header, footer
└── pages/
    └── index.astro              # Home: hero, about, music, gallery, contact
public/                          # Static assets (favicon, etc.)
```

Replace placeholder content (hero tagline, body text, Spotify embed, images) with real copy and assets when ready.
