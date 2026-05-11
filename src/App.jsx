
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Atom, Eye, MoveHorizontal, RotateCcw, Sparkles, Waves } from "lucide-react";

const TWO_PI = 2 * Math.PI;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function round(v, d = 3) {
  const s = 10 ** d;
  return Math.round(v * s) / s;
}

function SliderCard({ label, hint, value, min, max, step, unit, onChange }) {
  return (
    <div className="slider-card">
      <div className="slider-head">
        <div>
          <div className="slider-label">{label}</div>
          <div className="slider-hint">{hint}</div>
        </div>
        <div className="pill">{value} {unit}</div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Concept({ icon, title, children }) {
  return (
    <div className="concept">
      <h3>{icon}{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function slitPositions(numSlits, spacing) {
  const positions = [];
  const mid = (numSlits - 1) / 2;
  for (let i = 0; i < numSlits; i++) {
    positions.push((i - mid) * spacing);
  }
  return positions;
}

function apertureSize(numSlits, spacing) {
  return Math.max(0.001, (numSlits - 1) * spacing);
}

function fraunhoferDistance(numSlits, spacing, wavelength) {
  const D = apertureSize(numSlits, spacing);
  return Math.max(30, 2 * D * D / wavelength);
}


function getAutoViewScale(numSlits, spacing) {
  /*
    Base fit scale. This is only the starting point.
    The user-controlled view zoom multiplies this value.
  */
  const D = apertureSize(numSlits, spacing);
  const targetAperturePixels = 390;
  const maxScale = 82;
  const minScale = 26;

  if (D < 0.01) return 74;
  return clamp(targetAperturePixels / D, minScale, maxScale);
}

function getViewScale(params) {
  return getAutoViewScale(params.numSlits, params.spacing) * params.viewZoom;
}

function getSlitHalfHeight(params) {
  if (params.numSlits <= 1) return 18;
  return clamp(0.13 * getViewScale(params) * params.spacing, 4, 15);
}

function computeFarFieldPattern({ numSlits, spacing, wavelength, angleMaxDeg }) {
  const slits = slitPositions(numSlits, spacing);
  const k = TWO_PI / wavelength;
  const out = [];

  for (let i = 0; i <= 900; i++) {
    const thetaDeg = -angleMaxDeg + (2 * angleMaxDeg * i) / 900;
    const theta = (thetaDeg * Math.PI) / 180;
    let re = 0;
    let im = 0;

    for (const y of slits) {
      const phase = k * y * Math.sin(theta);
      re += Math.cos(phase);
      im += Math.sin(phase);
    }

    const intensity = (re * re + im * im) / (numSlits * numSlits);
    out.push({ theta: thetaDeg, intensity });
  }

  return out;
}

function colorMapTurboLike(v) {
  /*
    Lightweight rainbow/turbo-like map.
    v is expected from 0 to 1.
    This gives the red/yellow/green/cyan/blue feeling of the reference image.
  */
  const x = clamp(v, 0, 1);
  const r = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 3), 0, 1));
  const g = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 2), 0, 1));
  const b = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 1), 0, 1));
  return `rgb(${r},${g},${b})`;
}

function colorMapTurboRGB(v) {
  const x = clamp(v, 0, 1);
  const r = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 3), 0, 1));
  const g = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 2), 0, 1));
  const b = Math.floor(255 * clamp(1.5 - Math.abs(4 * x - 1), 0, 1));
  return [r, g, b];
}


function FarFieldIntensityPlot({ params }) {
  const width = 900;
  const height = 380;
  const padL = 72;
  const padR = 24;
  const padT = 28;
  const padB = 58;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const data = computeFarFieldPattern(params);

  function xScale(theta) {
    return padL + ((theta + params.angleMaxDeg) / (2 * params.angleMaxDeg)) * plotW;
  }

  function yScale(intensity) {
    return padT + (1 - intensity) * plotH;
  }

  const linePath = data
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.theta).toFixed(2)} ${yScale(p.intensity).toFixed(2)}`)
    .join(" ");

  const fillPath = `${linePath} L ${xScale(params.angleMaxDeg)} ${padT + plotH} L ${xScale(-params.angleMaxDeg)} ${padT + plotH} Z`;

  const xTicks = [];
  for (let t = -params.angleMaxDeg; t <= params.angleMaxDeg + 0.1; t += params.angleMaxDeg / 3) {
    xTicks.push(t);
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Far field intensity plot">
      <rect width={width} height={height} fill="#ffffff" />

      {xTicks.map((t, idx) => (
        <g key={`xt-${idx}`}>
          <line x1={xScale(t)} y1={padT} x2={xScale(t)} y2={padT + plotH} stroke="#dbe3ef" strokeDasharray="4 5" />
          <text x={xScale(t)} y={height - 30} textAnchor="middle" fill="#64748b" fontSize="14">{round(t, 0)}°</text>
        </g>
      ))}
      {yTicks.map((v) => (
        <g key={`yt-${v}`}>
          <line x1={padL} y1={yScale(v)} x2={padL + plotW} y2={yScale(v)} stroke="#dbe3ef" strokeDasharray="4 5" />
          <text x={padL - 12} y={yScale(v) + 5} textAnchor="end" fill="#64748b" fontSize="14">{v}</text>
        </g>
      ))}

      <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#475569" strokeWidth="1.5" />
      <line x1={padL} y1={padT + plotH} x2={padL + plotW} y2={padT + plotH} stroke="#475569" strokeWidth="1.5" />

      <path d={fillPath} fill="#38bdf8" opacity="0.25" />
      <path d={linePath} fill="none" stroke="#0f172a" strokeWidth="3" />

      <text x={width / 2} y={height - 8} textAnchor="middle" fill="#475569" fontSize="15" fontWeight="700">far-field angle θ</text>
      <text x="22" y={height / 2 + 40} transform={`rotate(-90 22 ${height / 2 + 40})`} textAnchor="middle" fill="#475569" fontSize="15" fontWeight="700">normalized intensity I(θ)</text>

      <text x={padL} y="20" fill="#0f172a" fontSize="15" fontWeight="800">
        Far-field pattern from the N-slit array factor
      </text>
    </svg>
  );
}

/*
  This is the corrected main visual.

  Left of the aperture:
    incident plane wave, E = cos(kx - wt)

  Right of the aperture:
    total scalar field from slit wavelets,
    E = sum_m cos(k r_m - wt) / sqrt(r_m)

  This is much closer to the reference picture than drawing separate circles.
*/


function ColorScalarFieldCanvas({ params, tick, showContours, edgeMode }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 1000;
    const height = 610;
    const slitX = 125;
    const screenX = 885;
    const centerY = height / 2;
    const pxPerUnit = getViewScale(params);
    const slits = slitPositions(params.numSlits, params.spacing);
    const slitYs = slits.map((s) => centerY + s * pxPerUnit);
    const k = TWO_PI / params.wavelength;
    const omegaT = tick * 0.115 * params.animationSpeed;

    /*
      v7 high-resolution renderer:
      Previous SVG version used about 160 x 108 = 17,280 field cells.
      This canvas version uses 560 x 320 = 179,200 samples,
      which is more than 10x the field-sampling resolution.
    */
    const fieldW = screenX;
    const fieldH = height;
    const cols = 560;
    const rows = 320;

    const ctx = canvas.getContext("2d", { alpha: false });
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    const img = ctx.createImageData(cols, rows);
    const valuesRe = new Float32Array(cols * rows);
    const valuesMag = new Float32Array(cols * rows);

    let maxAbsRe = 1e-9;
    let maxMag = 1e-9;

    function fieldComplexAtPixel(px, py) {
      if (px < slitX - 4) {
        const xModel = (px - slitX) / pxPerUnit;
        const phase = k * xModel - omegaT;
        return [Math.cos(phase), Math.sin(phase)];
      }

      const xModel = Math.max(0.04, (px - slitX) / pxPerUnit);
      const yModel = (py - centerY) / pxPerUnit;
      let re = 0;
      let im = 0;

      for (const ys of slits) {
        const r = Math.sqrt(xModel * xModel + (yModel - ys) * (yModel - ys));
        const amp = 1 / Math.sqrt(Math.max(r, 0.08));
        const phase = k * r - omegaT;
        re += amp * Math.cos(phase);
        im += amp * Math.sin(phase);
      }

      const scale = Math.sqrt(params.numSlits);
      return [re / scale, im / scale];
    }

    // First pass: compute values and normalization.
    for (let iy = 0; iy < rows; iy++) {
      const py = (iy + 0.5) * fieldH / rows;
      for (let ix = 0; ix < cols; ix++) {
        const px = (ix + 0.5) * fieldW / cols;
        const [re, im] = fieldComplexAtPixel(px, py);
        const idx = iy * cols + ix;
        const mag = Math.sqrt(re * re + im * im);
        valuesRe[idx] = re;
        valuesMag[idx] = mag;
        maxAbsRe = Math.max(maxAbsRe, Math.abs(re));
        maxMag = Math.max(maxMag, mag);
      }
    }

    // Second pass: colorize. The image itself is still signed Re{E}, like the reference.
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const idx = iy * cols + ix;
        const re = valuesRe[idx];
        const norm = 0.5 + 0.5 * Math.tanh(1.35 * re / maxAbsRe);
        const [r, g, b] = colorMapTurboRGB(norm);
        const p = idx * 4;
        img.data[p] = r;
        img.data[p + 1] = g;
        img.data[p + 2] = b;
        img.data[p + 3] = 255;
      }
    }

    const off = document.createElement("canvas");
    off.width = cols;
    off.height = rows;
    const offCtx = off.getContext("2d", { alpha: false });
    offCtx.putImageData(img, 0, 0);

    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, fieldW, fieldH);

    // Optional phase contour overlay.
    if (showContours) {
      const wavelengthPx = params.wavelength * pxPerUnit;
      const phaseShift = (tick * params.animationSpeed * 2.5) % wavelengthPx;
      ctx.save();
      ctx.strokeStyle = "rgba(0, 17, 31, 0.22)";
      ctx.lineWidth = 1.1;

      for (const y of slitYs) {
        for (let r = phaseShift; r < 1100; r += wavelengthPx) {
          if (r > 10) {
            ctx.globalAlpha = clamp(0.34 - r / 2200, 0.03, 0.26);
            ctx.beginPath();
            ctx.arc(slitX, y, r, 0, TWO_PI);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    }

    // Aperture screen and slits.
    const slitHalfHeight = getSlitHalfHeight(params);
    const sortedYs = [...slitYs].sort((a, b) => a - b);
    let last = 0;

    ctx.save();
    ctx.fillStyle = "rgba(229, 231, 235, 0.96)";

    for (const y of sortedYs) {
      const y1 = last;
      const y2 = Math.max(last, y - slitHalfHeight);
      ctx.fillRect(slitX - 8, y1, 16, Math.max(0, y2 - y1));
      last = Math.min(height, y + slitHalfHeight);
    }
    ctx.fillRect(slitX - 8, last, 16, Math.max(0, height - last));

    // Slit labels.
    ctx.font = "900 13px Inter, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    for (let i = 0; i < slitYs.length; i++) {
      const y = slitYs[i];
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(slitX, y, 4.8, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(slitX, y, 2.5, 0, TWO_PI);
      ctx.fill();
      ctx.fillStyle = "#111827";
      ctx.fillText(`S${i + 1}`, slitX + 14, y);
    }
    ctx.restore();

    // Aperture D bracket.
    if (params.numSlits > 1) {
      const yMin = Math.min(...slitYs);
      const yMax = Math.max(...slitYs);
      ctx.save();
      ctx.strokeStyle = "rgba(17, 24, 39, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(slitX - 26, yMin);
      ctx.lineTo(slitX - 26, yMax);
      ctx.moveTo(slitX - 34, yMin);
      ctx.lineTo(slitX - 18, yMin);
      ctx.moveTo(slitX - 34, yMax);
      ctx.lineTo(slitX - 18, yMax);
      ctx.stroke();
      ctx.fillStyle = "#111827";
      ctx.font = "900 13px Inter, system-ui, sans-serif";
      ctx.fillText("aperture D", slitX - 90, centerY + 5);
      ctx.restore();
    }

    // Right-edge switchable trace: signed Re{E} or complex magnitude |E|.
    ctx.save();
    ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
    ctx.fillRect(screenX, 0, width - screenX, height);

    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 15px Inter, system-ui, sans-serif";
    ctx.fillText(edgeMode === "magnitude" ? "right-edge |E|" : "right-edge Re{E}", screenX + 12, 30);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(edgeMode === "magnitude" ? "complex magnitude field" : "signed real field", screenX + 12, 51);

    const sampleCount = 220;
    const screenSampleX = screenX - 18;
    const samples = [];
    let maxTrace = 1e-9;

    for (let i = 0; i < sampleCount; i++) {
      const y = 22 + (i / (sampleCount - 1)) * (height - 44);
      const [re, im] = fieldComplexAtPixel(screenSampleX, y);
      const mag = Math.sqrt(re * re + im * im);
      const val = edgeMode === "magnitude" ? mag : re;
      maxTrace = Math.max(maxTrace, Math.abs(val));
      samples.push({ y, val });
    }

    const x0 = screenX + 58;
    ctx.strokeStyle = "rgba(226, 232, 240, 0.9)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x0, 74);
    ctx.lineTo(x0, height - 22);
    ctx.stroke();

    // bars
    ctx.lineWidth = 2.0;
    for (const s of samples) {
      const normalized = s.val / maxTrace;
      const bar = normalized * 46;
      ctx.strokeStyle = edgeMode === "magnitude"
        ? "#fbbf24"
        : normalized >= 0 ? "#22d3ee" : "#fb7185";
      ctx.globalAlpha = 0.88;
      ctx.beginPath();
      ctx.moveTo(x0, s.y);
      ctx.lineTo(x0 + bar, s.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // smooth trace curve overlay
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = edgeMode === "magnitude" ? "#fde68a" : "#ffffff";
    ctx.beginPath();
    samples.forEach((s, i) => {
      const normalized = s.val / maxTrace;
      const x = x0 + normalized * 46;
      if (i === 0) ctx.moveTo(x, s.y);
      else ctx.lineTo(x, s.y);
    });
    ctx.stroke();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText(edgeMode === "magnitude" ? "|E| ≥ 0 amplitude envelope" : "signed amplitude, not intensity", screenX + 12, height - 20);
    ctx.restore();

    // Labels last, for readability.
    ctx.save();
    ctx.fillStyle = "#111827";
    ctx.font = "950 18px Inter, system-ui, sans-serif";
    ctx.fillText("incident plane wave", 28, 36);
    ctx.fillText("total scalar field Re{E(x,y,t)}", slitX + 35, 36);

    ctx.font = "850 14px Inter, system-ui, sans-serif";
    ctx.fillText(`Manual view zoom = ${round(params.viewZoom, 2)}×. Resolution: ${cols}×${rows} field samples.`, 28, height - 18);
    ctx.restore();
  }, [params, tick, showContours, edgeMode]);

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={610}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-label="High-resolution scalar field with switchable right-edge trace"
    />
  );
}

export default function App() {
  const [params, setParams] = useState({
    numSlits: 2,
    spacing: 1.55,
    wavelength: 0.72,
    angleMaxDeg: 35,
    animationSpeed: 1.0,
    viewZoom: 1.0,
  });

  const [tick, setTick] = useState(0);
  const [showContours, setShowContours] = useState(false);
  const [edgeMode, setEdgeMode] = useState("real");

  React.useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function update(key, value) {
    setParams((old) => ({ ...old, [key]: value }));
  }

  function reset() {
    setParams({
      numSlits: 2,
      spacing: 1.55,
      wavelength: 0.72,
      angleMaxDeg: 35,
      animationSpeed: 1.0,
      viewZoom: 1.0,
    });
    setShowContours(false);
    setEdgeMode("real");
  }

  function singleSlitLike() {
    setParams({ numSlits: 1, spacing: 1.4, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0, viewZoom: 1.0 });
  }

  function classicDoubleSlit() {
    setParams({ numSlits: 2, spacing: 1.55, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0, viewZoom: 1.0 });
  }

  function gratingDemo() {
    setParams({ numSlits: 7, spacing: 1.12, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0, viewZoom: 1.0 });
  }

  const D = apertureSize(params.numSlits, params.spacing);
  const Lff = fraunhoferDistance(params.numSlits, params.spacing, params.wavelength);

  return (
    <div className="app">
      <div className="shell">
        <motion.header
          className="hero glass"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div>
            <div className="badge"><Atom size={20} /> Double slit and multi-slit experiment</div>
            <h1>Coherent waves form bright and dark interference directions</h1>
            <p>
              A monochromatic plane wave illuminates an aperture with one or more slits.
              The visualization plots the continuous scalar field. When the number of slits or slit distance increases, the aperture view automatically zooms out.
            </p>
          </div>

          <div className="button-grid">
            <button className="btn" onClick={classicDoubleSlit}>Double slit</button>
            <button className="btn secondary" onClick={singleSlitLike}>One slit</button>
            <button className="btn secondary" onClick={gratingDemo}>Many slits</button>
            <button className="btn outline" onClick={reset}><RotateCcw size={16} /> Reset</button>
          </div>
        </motion.header>

        <main className="main-grid">
          <motion.aside
            className="controls glass"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div>
              <h2 className="section-title">Experiment controls</h2>
              <p className="section-subtitle">
                The main image uses a high-resolution canvas renderer. Zoom out to see more of a large aperture, or zoom in to inspect the near-slit field.
              </p>
            </div>

            <SliderCard
              label="Number of slits"
              hint="More slits increase the aperture size. The field view automatically zooms out."
              value={params.numSlits}
              min={1}
              max={9}
              step={1}
              unit="slits"
              onChange={(v) => update("numSlits", v)}
            />

            <SliderCard
              label="Slit distance d"
              hint="Distance between neighbouring slits."
              value={params.spacing}
              min={0.4}
              max={2.8}
              step={0.1}
              unit="units"
              onChange={(v) => update("spacing", v)}
            />

            <SliderCard
              label="Shared wavelength λ"
              hint="All slits are illuminated by the same monochromatic wave."
              value={params.wavelength}
              min={0.35}
              max={1.25}
              step={0.01}
              unit="units"
              onChange={(v) => update("wavelength", v)}
            />

            <SliderCard
              label="Angular viewing range"
              hint="Range of far-field angles shown in the intensity plot."
              value={params.angleMaxDeg}
              min={10}
              max={70}
              step={1}
              unit="°"
              onChange={(v) => update("angleMaxDeg", v)}
            />

            <SliderCard
              label="Animation speed"
              hint="Only changes the speed of the moving field."
              value={params.animationSpeed}
              min={0.2}
              max={2.5}
              step={0.1}
              unit="×"
              onChange={(v) => update("animationSpeed", v)}
            />

            <SliderCard
              label="View zoom"
              hint="Manually zoom in or out of the aperture and field view."
              value={params.viewZoom}
              min={0.45}
              max={2.2}
              step={0.05}
              unit="×"
              onChange={(v) => update("viewZoom", v)}
            />

            <div className="equation-box">
              <h3>Far-field check</h3>
              <p>
                Aperture size D = {round(D, 3)}. A common Fraunhofer scale is approximately 2D²/λ = {round(Lff, 3)}.
                The intensity plot uses the far-field angle θ directly.
              </p>
            </div>
          </motion.aside>

          <section className="visual-stack">
            <motion.div
              className="panel glass"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <div className="panel-head">
                <div>
                  <h2>Figure 1 — continuous scalar field</h2>
                  <p>
                    This is the corrected high-resolution view: incident plane waves on the left, and the total field after the slits on the right. Use the View zoom slider to zoom in/out manually.
                    This is closer to the reference image than drawing independent circular wavefronts.
                  </p>
                </div>

                <div className="mode-toggle">
                  <button className={showContours ? "btn secondary" : "btn"} onClick={() => setShowContours(false)}>
                    Color field
                  </button>
                  <button className={showContours ? "btn" : "btn secondary"} onClick={() => setShowContours(true)}>
                    Color + contours
                  </button>
                  <button className={edgeMode === "real" ? "btn" : "btn secondary"} onClick={() => setEdgeMode("real")}>
                    Right: Re&#123;E&#125;
                  </button>
                  <button className={edgeMode === "magnitude" ? "btn" : "btn secondary"} onClick={() => setEdgeMode("magnitude")}>
                    Right: |E|
                  </button>
                </div>
              </div>

              <div className="canvas-wrap">
                <ColorScalarFieldCanvas params={params} tick={tick} showContours={showContours} edgeMode={edgeMode} />
              </div>

              <div className="legend">
                <span className="legend-item"><span className="dot green-dot" /> instantaneous scalar field</span>
                <span className="legend-item"><span className="dot amber-dot" /> slit openings</span>
                <span className="legend-item">view zoom: {round(params.viewZoom, 2)}×</span>
                <span className="legend-item">right trace: {edgeMode === "magnitude" ? "|E|" : "Re{E}"}</span>
                <span className="legend-item"><span className="dot violet-dot" /> optional phase contours</span>
              </div>
            </motion.div>

            <div className="two-col">
              <div className="panel glass">
                <div className="panel-head">
                  <div>
                    <h2>Far-field intensity pattern</h2>
                    <p>
                      This plot is not taken from a movable near screen. It is the far-field angular pattern I(θ).
                    </p>
                  </div>
                  <span className="pill">I(θ)</span>
                </div>

                <div className="chart-wrap">
                  <FarFieldIntensityPlot params={params} />
                </div>
              </div>

              <div className="equation-box">
                <h3>Classical wave-optics formulation</h3>

                <p>
                  The field after the slits is the superposition of coherent wavelets.
                </p>

                <div className="eq">
                  E(x,y,t) = Σ<sub>m=1</sub><sup>N</sup> A<sub>m</sub> cos(k r<sub>m</sub> − ωt)
                </div>

                <p>In the far field, each slit contributes a phase proportional to y<sub>m</sub> sin(θ).</p>

                <div className="eq">
                  E(θ) = Σ<sub>m=1</sub><sup>N</sup> A<sub>m</sub> exp[j k y<sub>m</sub> sin(θ)]
                </div>

                <div className="eq">
                  I(θ) = |E(θ)|², &nbsp;&nbsp; k = 2π / λ
                </div>

                <p>Constructive interference occurs when the neighbouring-slit path difference is an integer number of wavelengths:</p>

                <div className="eq">
                  d sin(θ) = n λ
                </div>

                <div className="eq">
                  sin(θ<sub>n</sub>) = n λ / d
                </div>
              </div>
            </div>

            <div className="panel glass">
              <h2 className="section-title">Experiment explanation</h2>
              <div className="teacher-grid">
                <div className="teacher-step">
                  <strong>1. Coherent illumination</strong>
                  A single-frequency wave illuminates all slits with a fixed phase relationship.
                </div>
                <div className="teacher-step">
                  <strong>2. Slits act as wavelet sources</strong>
                  Each slit radiates a wavelet with the same frequency as the incident wave.
                </div>
                <div className="teacher-step">
                  <strong>3. Phase difference</strong>
                  At a far-field angle θ, neighbouring slits have path difference d sin θ.
                </div>
                <div className="teacher-step">
                  <strong>4. Bright and dark directions</strong>
                  Integer-wavelength path differences produce maxima; half-integer differences produce minima.
                </div>
              </div>
            </div>

            <div className="explain">
              <Concept icon={<Waves size={18} />} title="Why the old wavefront view looked wrong">
                Drawing independent circular rings from every slit does not show the actual summed field. The corrected view calculates the field value at every point by adding the contributions from all slits.
              </Concept>

              <Concept icon={<MoveHorizontal size={18} />} title="What does changing slit distance do?">
                Increasing d changes the angular spacing of the maxima. The condition d sin θ = nλ shows that larger spacing moves maxima closer together in angle.
              </Concept>

              <Concept icon={<Eye size={18} />} title="Why use far-field intensity?">
                The standard double-slit equation is a far-field angular result. Near the slits, the field is a propagation picture; far away, it becomes a stable angular interference pattern.
              </Concept>

              <Concept icon={<Sparkles size={18} />} title="Amplitude before intensity">
                The scalar or complex amplitudes add first. Only after summing the field do we calculate intensity using I = |E|².
              </Concept>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
