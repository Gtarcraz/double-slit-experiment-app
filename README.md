# Double Slit Experiment App v5

Interactive Vite + React app for the double-slit and multi-slit wave interference experiment.

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
