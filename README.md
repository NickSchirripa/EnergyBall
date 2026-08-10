# Energy Ball

A full-screen, real-time raymarched GLSL shader rendered with Three.js — a pulsing volumetric "energy ball" flying through twisted fractal space, with a live control panel for tweaking motion, lighting, and color.

## Demo

**[energyball.vercel.app](https://energyball.vercel.app)**

## How it works

The whole visual is a single fragment shader painted onto a 2×2 plane in front of an orthographic camera. There is no geometry to speak of — every pixel is computed independently:

- **Raymarching loop** (99 steps max) walks a ray outward from the camera, folding space with `mod()` so the volume repeats infinitely along Z. Two early-exit conditions (light saturation and a far-clip at 25 units) keep the cost down in bright regions.
- **Fractal domain warp** — an inner loop of 6 iterations adds `sin(space * scale)` at increasing frequencies, producing the filament structure inside the ball.
- **Light accumulation** — each step adds `palette / stepDistance * totalDistance`, so tight surfaces glow hot. A custom `tanh` (WebGL1 doesn't ship one) tone-maps the accumulated HDR value back into displayable range.
- **Cinematic grain** — a hash-based per-pixel noise both dithers the ray start distance (killing banding) and optionally overlays film grain.

## Controls

Open the **Shader Settings** panel in the top-right (collapsed by default):

| Control | Range | What it does |
| --- | --- | --- |
| Device Pixel Ratio | 0.1 – 4.0 | Render resolution. Lower it if the framerate drops; raise it for a crisper image. |
| Flight Speed | -1.0 – 1.0 | How fast the camera travels through the repeating volume. |
| Animation Speed | -5.0 – 5.0 | Rate the internal fractal churns. Negative values run it backwards. |
| Light Intensity | 1000 – 100000 | Tone-mapping divisor. Higher = darker, more contrast. |
| Noise Grain Amount | 0.0 – 0.5 | Film-grain overlay strength. |
| Red / Green / Blue Offset | -10.0 – 10.0 | Phase offsets into the cosine color palette. Small nudges shift the whole hue scheme. |

## Running locally

No build step and no dependencies to install — Three.js (r128) and lil-gui load from CDN. Just serve the folder over HTTP:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly via `file://` also works in most browsers.

## Deploying

The project is a zero-config static site.

```bash
vercel        # preview deployment
vercel --prod # production deployment
```

## Files

- [index.html](index.html) — page shell, CDN script tags
- [script.js](script.js) — Three.js setup, the vertex/fragment shaders, and the lil-gui bindings
- [style.css](style.css) — full-bleed black canvas, no scrollbars

## Requirements

Any browser with WebGL support. The shader is heavy — if it stutters, drop **Device Pixel Ratio** to 0.5 first.
