
import React, { useMemo, useState } from "react";
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
    Auto zoom-out rule:
    More slits or larger slit spacing means a larger aperture D.
    The pixels-per-unit scale is reduced so the entire aperture remains visible.
  */
  const D = apertureSize(numSlits, spacing);
  const targetAperturePixels = 410;
  const maxScale = 88;
  const minScale = 30;

  if (D < 0.01) return 78;
  return clamp(targetAperturePixels / D, minScale, maxScale);
}

function getSlitHalfHeight(numSlits, spacing) {
  if (numSlits <= 1) return 18;
  return clamp(0.13 * getAutoViewScale(numSlits, spacing) * spacing, 5, 15);
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
function ColorScalarFieldSVG({ params, tick, showContours }) {
  const width = 1000;
  const height = 610;
  const slitX = 125;
  const centerY = height / 2;
  const pxPerUnit = getAutoViewScale(params.numSlits, params.spacing);
  const slits = slitPositions(params.numSlits, params.spacing);
  const slitYs = slits.map((s) => centerY + s * pxPerUnit);
  const k = TWO_PI / params.wavelength;
  const omegaT = tick * 0.115 * params.animationSpeed;

  const cols = 175;
  const rows = 110;
  const dx = width / cols;
  const dy = height / rows;
  const cells = [];

  let maxA = 1e-9;
  const raw = [];

  for (let ix = 0; ix < cols; ix++) {
    for (let iy = 0; iy < rows; iy++) {
      const px = ix * dx + dx * 0.5;
      const py = iy * dy + dy * 0.5;

      let e = 0;

      if (px < slitX - 4) {
        // plane wave on the incident side
        const xModel = (px - slitX) / pxPerUnit;
        e = Math.cos(k * xModel - omegaT);
      } else {
        const xModel = Math.max(0.04, (px - slitX) / pxPerUnit);
        const yModel = (py - centerY) / pxPerUnit;

        for (const ys of slits) {
          const r = Math.sqrt(xModel * xModel + (yModel - ys) * (yModel - ys));
          const amp = 1 / Math.sqrt(Math.max(r, 0.08));
          e += amp * Math.cos(k * r - omegaT);
        }

        // mild normalization so 1 slit and many slits both look good
        e /= Math.sqrt(params.numSlits);
      }

      maxA = Math.max(maxA, Math.abs(e));
      raw.push({ ix, iy, e });
    }
  }

  for (const p of raw) {
    const norm = 0.5 + 0.5 * Math.tanh(1.35 * p.e / maxA);
    cells.push({
      x: p.ix * dx,
      y: p.iy * dy,
      w: dx + 0.3,
      h: dy + 0.3,
      color: colorMapTurboLike(norm),
    });
  }

  const barrierSegments = [];
  let last = 0;
  const slitHalfHeight = getSlitHalfHeight(params.numSlits, params.spacing);
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(height, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: height });

  const contourRings = [];
  if (showContours) {
    const wavelengthPx = params.wavelength * pxPerUnit;
    const phaseShift = (tick * params.animationSpeed * 2.5) % wavelengthPx;
    for (const y of slitYs) {
      for (let r = phaseShift; r < 1100; r += wavelengthPx) {
        if (r > 10) contourRings.push({ x: slitX, y, r });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Colored total scalar field">
      <rect width={width} height={height} fill="#020617" />

      {cells.map((c, idx) => (
        <rect key={idx} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} />
      ))}

      {showContours && (
        <g>
          {contourRings.map((ring, idx) => (
            <circle
              key={`ring-${idx}`}
              cx={ring.x}
              cy={ring.y}
              r={ring.r}
              fill="none"
              stroke="#00111f"
              strokeWidth="1.1"
              opacity={clamp(0.34 - ring.r / 2200, 0.03, 0.26)}
            />
          ))}
        </g>
      )}

      {/* Aperture screen */}
      {barrierSegments.map((seg, idx) => (
        <rect
          key={`barrier-${idx}`}
          x={slitX - 8}
          y={seg.y1}
          width={16}
          height={Math.max(0, seg.y2 - seg.y1)}
          fill="#e5e7eb"
          opacity="0.96"
        />
      ))}

      {slitYs.map((y, idx) => (
        <g key={`source-${idx}`}>
          <circle cx={slitX} cy={y} r="4.8" fill="#111827" />
          <circle cx={slitX} cy={y} r="2.5" fill="#fbbf24" />
          <text x={slitX + 14} y={y + 5} fill="#111827" fontWeight="900" fontSize="13">S{idx + 1}</text>
        </g>
      ))}

      {/* aperture extent guide */}
      {params.numSlits > 1 && (
        <g>
          <line x1={slitX - 26} y1={Math.min(...slitYs)} x2={slitX - 26} y2={Math.max(...slitYs)} stroke="#111827" strokeWidth="2" opacity="0.55" />
          <line x1={slitX - 34} y1={Math.min(...slitYs)} x2={slitX - 18} y2={Math.min(...slitYs)} stroke="#111827" strokeWidth="2" opacity="0.55" />
          <line x1={slitX - 34} y1={Math.max(...slitYs)} x2={slitX - 18} y2={Math.max(...slitYs)} stroke="#111827" strokeWidth="2" opacity="0.55" />
          <text x={slitX - 90} y={centerY + 5} fill="#111827" fontWeight="900" fontSize="13">
            aperture D
          </text>
        </g>
      )}

      <text x="28" y="36" fill="#111827" fontWeight="950" fontSize="18">incident plane wave</text>
      <text x={slitX + 35} y="36" fill="#111827" fontWeight="950" fontSize="18">
        total scalar field Re&#123;E(x,y,t)&#125;
      </text>
      <text x="28" y={height - 18} fill="#111827" fontSize="14" fontWeight="850">
        Color shows instantaneous signed field. The visible bright/dark directions come from interference.
      </text>
    </svg>
  );
}

export default function App() {
  const [params, setParams] = useState({
    numSlits: 2,
    spacing: 1.55,
    wavelength: 0.72,
    angleMaxDeg: 35,
    animationSpeed: 1.0,
  });

  const [tick, setTick] = useState(0);
  const [showContours, setShowContours] = useState(false);

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
    });
    setShowContours(false);
  }

  function singleSlitLike() {
    setParams({ numSlits: 1, spacing: 1.4, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
  }

  function classicDoubleSlit() {
    setParams({ numSlits: 2, spacing: 1.55, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
  }

  function gratingDemo() {
    setParams({ numSlits: 7, spacing: 1.12, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
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
                The main image auto-zooms when the aperture becomes larger, so increasing the number of slits shows the full aperture instead of cropping the view.
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
                    This is the corrected view: incident plane waves on the left, and the total field after the slits on the right. The view zooms out automatically for larger aperture size.
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
                </div>
              </div>

              <div className="canvas-wrap">
                <ColorScalarFieldSVG params={params} tick={tick} showContours={showContours} />
              </div>

              <div className="legend">
                <span className="legend-item"><span className="dot green-dot" /> instantaneous scalar field</span>
                <span className="legend-item"><span className="dot amber-dot" /> slit openings</span>
                <span className="legend-item">auto zoom: {round(getAutoViewScale(params.numSlits, params.spacing), 1)} px/unit</span>
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
