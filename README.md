# Double Slit Experiment App v3

Interactive Vite + React app for the double-slit and multi-slit wave interference experiment.

## Changes in v3

- Fixed equation rendering by removing KaTeX dependency and using robust HTML equations.
- Replaced the broken Recharts intensity plot with a custom SVG far-field intensity plot.
- Observation is forced into the far-field formulation.
- Added a far-field check using aperture size D and Fraunhofer scale 2D²/λ.
- Removed the remaining mention of secondary-school students.
- Added a button to toggle between:
  - total complex amplitude map
  - Huygens wavefront lines

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
E(θ) = Σ_m A_m exp[j k y_m sin(θ)]
I(θ) = |E(θ)|²
k = 2π / λ
d sin(θ) = n λ
sin(θ_n) = n λ / d
```
