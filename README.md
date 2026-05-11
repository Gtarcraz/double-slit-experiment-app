# Double Slit Experiment App v8

Interactive Vite + React app for the double-slit and multi-slit wave interference experiment.

## Changes in v8

- Right-edge panel now overlays both Re{E} and |E| at the same time.
- Removed the old switchable edge-mode buttons.
- Extended manual zoom range from 0.15× to 5.0×.
- Added clearer right-edge labels and mini legend.

## Changes in v7

- Replaced SVG cell field rendering with a high-resolution canvas renderer.
- Field grid increased from about 17k cells to about 179k samples, more than 10x higher resolution.
- Added switchable right-edge trace:
  - Re{E}: signed real field
  - |E|: complex field magnitude
- Added a smooth curve overlay on the right trace.

## Changes in v6

- Replaced automatic-only zoom with a user-controlled View zoom slider.
- Added a right-edge histogram/trace of the real field Re{E} at the end of Figure 1.
- The right-side bars show signed amplitude, not intensity.

## Changes in v5

- Added automatic zoom-out for larger apertures.
- Increasing the number of slits or slit spacing now rescales the vertical field view.
- Added an aperture D guide in the main field plot.

## Changes in v4

- Replaced the misleading independent-ring wavefront view with a continuous colored scalar field.
- The main image now resembles a classical wave-optics field plot:
  - incident plane wave before the aperture
  - total summed field after the slits
- Added optional contour overlay.
- Kept the far-field intensity plot based on the N-slit array factor.
- Removed extra plotting libraries for reliability.

## Local Run

```bash
npm install
npm run dev
```

## Deploy

Push to GitHub and set:

```text
Settings → Pages → Source: GitHub Actions
```

Expected public URL:

```text
https://gtarcraz.github.io/double-slit-experiment-app/
```

## Main Equations

```text
E(x,y,t) = Σ_m A_m cos(k r_m − ωt)
E(θ) = Σ_m A_m exp[j k y_m sin(θ)]
I(θ) = |E(θ)|²
k = 2π / λ
d sin(θ) = n λ
sin(θ_n) = n λ / d
```
