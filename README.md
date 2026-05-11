# Double Slit Experiment App v2

Interactive Vite + React app for the double-slit and multi-slit wave interference experiment.

## Changes in v2

- Removed all wording about secondary-school students.
- Observation plane is fixed to the far-field formulation.
- Far-field intensity plot now uses angle θ and the N-slit array factor.
- Added a second figure showing the total complex amplitude field, similar to a wave-optics interference image.
- Corrected the maxima condition to:

```math
d\sin\theta=n\lambda
```

or equivalently:

```math
\sin\theta_n=\frac{n\lambda}{d}
```

## Features

- Control number of slits
- Control slit spacing
- Control shared wavelength
- Control angular viewing range
- Moving wavefront visualization
- Total complex amplitude field visualization
- Far-field intensity/fringe plot
- Classical wave-optics equations

## Local Run

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

## GitHub Pages Deployment Using GitHub Actions

Expected repo name:

```text
double-slit-experiment-app
```

Expected public URL:

```text
https://gtarcraz.github.io/double-slit-experiment-app/
```

### Push update to existing repo

```bash
git add .
git commit -m "Update double slit app v2"
git push
```

### GitHub Pages setting

In GitHub:

```text
Settings → Pages → Source: GitHub Actions
```

## Main Equations

Total far-field complex amplitude:

```math
E(\theta)=\sum_{m=1}^N A_m e^{j k y_m\sin\theta}
```

Intensity:

```math
I(\theta)=|E(\theta)|^2
```

Wavenumber:

```math
k=\frac{2\pi}{\lambda}
```

Maxima condition:

```math
d\sin\theta=n\lambda
```

## QR Code

The QR code points to:

```text
https://gtarcraz.github.io/double-slit-experiment-app/
```

Files:

```text
public/qr-code.png
public/qr-code-plain.png
```
