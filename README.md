# Double Slit Experiment App

Interactive Vite + React teaching app for the double-slit and multi-slit wave interference experiment.

## Features

- Control the number of slits
- Control slit spacing
- Control observation-plane distance
- Control observation-plane height
- One shared wavelength/frequency
- Moving wavefront visualization
- Screen intensity/fringe plot
- Explanation of the experiment and core equations

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

This project is ready for deployment through GitHub Actions.

Expected repo name:

```text
double-slit-experiment-app
```

Expected public URL:

```text
https://gtarcraz.github.io/double-slit-experiment-app/
```

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial double slit experiment app"
git branch -M main
git remote add origin git@github.com:Gtarcraz/double-slit-experiment-app.git
git push -u origin main
```

### 2. Set GitHub Pages source

In GitHub:

```text
Settings → Pages → Source: GitHub Actions
```

### 3. Watch deployment

Go to:

```text
Actions → Deploy Vite React App to GitHub Pages
```

## Main Equations

Total field from N slits:

```math
E(y)=\sum_{m=1}^N A_m e^{jkr_m(y)}
```

Intensity on the observation plane:

```math
I(y)=|E(y)|^2
```

Wavenumber:

```math
k=\frac{2\pi}{\lambda}
```

Far-field bright-fringe condition:

```math
d\sin\theta=m\lambda
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

Use `public/qr-code.png` in PowerPoint slides.
