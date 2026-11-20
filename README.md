# OMER.EXE

Retro desktop portfolio for **Omer** (18 y/o) — PCB designer and hardware tinkerer.

- Detailed retro **Apple-style desktop** look: platinum/grey bezel, beveled window chrome, desktop menubar feel, and realistic depth/shadows
- **Grey + purple** palette with **red neon** accents (Netflix-inspired neon red) and a red/purple neon toggle
- Pixel/retro fonts: self-hosted **Press Start 2P** + **VT323**
- CRT scanlines/glow, BIOS boot/loading sequence
- Projects pulled from real GitHub repos: flight controllers, macropads, dev boards, rocket avionics, and more

## Live site

Planned: `https://omruk5689-dev.github.io/omer-portfolio/`

## Deploy (GitHub Pages)

1. Create a public repo named `omer-portfolio` under `omruk5689-dev`.
2. Add it as remote and push `main`:
   ```bash
   git remote add origin https://github.com/omruk5689-dev/omer-portfolio.git
   git push -u origin main
   ```
3. In **Settings → Pages**, set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`.

## Connect to GitHub profile

Add a link to the live site in your profile README repo (`omruk5689-dev/omruk5689-dev`), for example:

```md
## OMER.EXE
**[omruk5689-dev.github.io/omer-portfolio](https://omruk5689-dev.github.io/omer-portfolio/)** — retro CRT portfolio. I'm Omer (18) and I love PCB design and hardware.
```

## Local preview

Static site (no build step). Serve the folder locally:

```bash
python3 -m http.server 8123
```

Then open `http://127.0.0.1:8123/`.

## Stack

- HTML, CSS, vanilla JS
- Self-hosted fonts in `assets/fonts/` (see included OFL license files)
- No dependencies

## Author

- GitHub: [@omruk5689-dev](https://github.com/omruk5689-dev)
- Interests: PCB design, hardware, and making LEDs blink

## License

Code and site content © 2026 Omer. Font licenses are included alongside the font files in `assets/fonts/`.
