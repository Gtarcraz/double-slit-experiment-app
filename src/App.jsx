
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

/*
  Far-field N-slit array factor:
    E(theta) = sum_m exp(j k y_m sin(theta))
    I(theta) = |E(theta)|^2 / N^2
*/
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

      {/* grid */}
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
        Far-field pattern: sharp peaks mean constructive interference
      </text>
    </svg>
  );
}

function AmplitudeMapSVG({ params, tick }) {
  const width = 1000;
  const height = 580;
  const slitX = 120;
  const centerY = height / 2;
  const pxPerUnit = 70;
  const slits = slitPositions(params.numSlits, params.spacing);
  const slitYs = slits.map((s) => centerY + s * pxPerUnit);
  const k = TWO_PI / params.wavelength;
  const omegaT = tick * 0.12 * params.animationSpeed;

  const cols = 135;
  const rows = 82;
  const x0 = slitX + 10;
  const x1 = width - 55;
  const y0 = 26;
  const y1 = height - 32;
  const dx = (x1 - x0) / cols;
  const dy = (y1 - y0) / rows;

  const cells = [];
  for (let ix = 0; ix < cols; ix++) {
    for (let iy = 0; iy < rows; iy++) {
      const px = x0 + ix * dx;
      const py = y0 + iy * dy;
      const xModel = Math.max(0.03, (px - slitX) / pxPerUnit);
      const yModel = (py - centerY) / pxPerUnit;

      let re = 0;
      let im = 0;

      for (const ys of slits) {
        const r = Math.sqrt(xModel * xModel + (yModel - ys) * (yModel - ys));
        const amp = 1 / Math.sqrt(Math.max(r, 0.06));
        const phase = k * r - omegaT;
        re += amp * Math.cos(phase);
        im += amp * Math.sin(phase);
      }

      const mag = Math.sqrt(re * re + im * im);
      const signed = Math.tanh(re / Math.sqrt(params.numSlits));
      const brightness = clamp(mag / (1.65 * params.numSlits), 0, 1);
      const alpha = 0.16 + 0.84 * brightness;
      const color = signed >= 0
        ? `rgba(34,211,238,${alpha})`
        : `rgba(244,63,94,${alpha})`;

      cells.push({ x: px, y: py, w: dx + 0.25, h: dy + 0.25, color });
    }
  }

  const barrierSegments = [];
  let last = 0;
  const slitHalfHeight = 12;
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(height, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: height });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Total complex amplitude map">
      <rect width={width} height={height} fill="#020617" />

      <defs>
        <filter id="ampGlow">
          <feGaussianBlur stdDeviation="1.1" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* incident plane wave amplitude stripes */}
      {Array.from({ length: 12 }).map((_, idx) => {
        const lambdaPx = params.wavelength * pxPerUnit;
        const x = slitX - 20 - ((idx * lambdaPx + tick * 2.8 * params.animationSpeed) % 370);
        return (
          <rect
            key={`inc-${idx}`}
            x={x}
            y="0"
            width="7"
            height={height}
            fill={idx % 2 ? "#22d3ee" : "#f43f5e"}
            opacity="0.78"
          />
        );
      })}

      <g filter="url(#ampGlow)">
        {cells.map((c, idx) => (
          <rect key={idx} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} />
        ))}
      </g>

      {barrierSegments.map((seg, idx) => (
        <rect
          key={`barrier-${idx}`}
          x={slitX - 8}
          y={seg.y1}
          width={16}
          height={Math.max(0, seg.y2 - seg.y1)}
          fill="#e2e8f0"
          opacity="0.96"
        />
      ))}

      {slitYs.map((y, idx) => (
        <g key={`source-${idx}`}>
          <circle cx={slitX} cy={y} r="5" fill="#fbbf24" />
          <text x={slitX + 14} y={y + 5} fill="#fde68a" fontWeight="800" fontSize="13">S{idx + 1}</text>
        </g>
      ))}

      <text x="28" y="36" fill="#e0f2fe" fontWeight="850" fontSize="18">incident plane wave</text>
      <text x={slitX + 40} y="36" fill="#e0f2fe" fontWeight="850" fontSize="18">total complex amplitude map: Re&#123;E&#125;</text>
      <text x="28" y={height - 18} fill="#cbd5e1" fontSize="14">
        Cyan/red are opposite phase signs. Brightness indicates stronger total complex amplitude.
      </text>
    </svg>
  );
}

function WavefrontSVG({ params, tick }) {
  const width = 1000;
  const height = 580;
  const slitX = 120;
  const screenX = 890; // screen drawn far from aperture in the illustration
  const centerY = height / 2;
  const pxPerUnit = 70;
  const slitYs = slitPositions(params.numSlits, params.spacing).map((s) => centerY + s * pxPerUnit);
  const wavelengthPx = params.wavelength * pxPerUnit;
  const phaseShift = (tick * params.animationSpeed * 2.5) % wavelengthPx;
  const rings = [];

  for (const y of slitYs) {
    for (let r = phaseShift; r < 1100; r += wavelengthPx) {
      if (r > 8) rings.push({ x: slitX, y, r });
    }
  }

  const barrierSegments = [];
  let last = 0;
  const slitHalfHeight = 12;
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(height, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: height });

  const pattern = computeFarFieldPattern(params);
  const bars = pattern.filter((_, i) => i % 7 === 0);
  const angleMaxRad = (params.angleMaxDeg * Math.PI) / 180;

  function thetaToY(thetaDeg) {
    const theta = (thetaDeg * Math.PI) / 180;
    return centerY + (theta / angleMaxRad) * (height * 0.43);
  }

  const D = apertureSize(params.numSlits, params.spacing);
  const Lff = fraunhoferDistance(params.numSlits, params.spacing, params.wavelength);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Moving wavefront diagram">
      <defs>
        <linearGradient id="screenGlow2" x1="0" x2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.95" />
        </linearGradient>
        <filter id="softGlow2">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={width} height={height} fill="#020617" />

      {Array.from({ length: 11 }).map((_, idx) => {
        const x = slitX - 30 - ((idx * wavelengthPx + phaseShift) % 390);
        return (
          <line
            key={`plane-${idx}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke={idx % 2 ? "#38bdf8" : "#7dd3fc"}
            strokeWidth="2"
            opacity="0.42"
          />
        );
      })}

      <text x="28" y="35" fill="#bae6fd" fontWeight="800" fontSize="18">incident plane wave</text>

      {barrierSegments.map((seg, idx) => (
        <rect
          key={`barrier-${idx}`}
          x={slitX - 8}
          y={seg.y1}
          width={16}
          height={Math.max(0, seg.y2 - seg.y1)}
          fill="#e2e8f0"
          opacity="0.94"
        />
      ))}
      <text x={slitX - 38} y={height - 18} fill="#e2e8f0" fontWeight="800" fontSize="15">slits</text>

      <g filter="url(#softGlow2)">
        {rings.map((ring, idx) => (
          <circle
            key={`ring-${idx}`}
            cx={ring.x}
            cy={ring.y}
            r={ring.r}
            fill="none"
            stroke={idx % 2 === 0 ? "#8b5cf6" : "#22d3ee"}
            strokeWidth="2.0"
            opacity={clamp(0.56 - ring.r / 1180, 0.055, 0.56)}
          />
        ))}
      </g>

      {slitYs.map((y, idx) => (
        <g key={`slit-label-${idx}`}>
          <circle cx={slitX} cy={y} r="5" fill="#f59e0b" />
          <text x={slitX + 16} y={y + 5} fill="#fde68a" fontSize="13" fontWeight="800">S{idx + 1}</text>
        </g>
      ))}

      <line x1={screenX} y1="0" x2={screenX} y2={height} stroke="#f8fafc" strokeWidth="3" strokeDasharray="8 8" />
      <text x={screenX - 205} y="34" fill="#fff7ed" fontWeight="800" fontSize="17">far-field observation plane</text>

      {bars.map((p, idx) => {
        const y = thetaToY(p.theta);
        const barW = 6 + p.intensity * 96;
        return (
          <rect
            key={`screen-bar-${idx}`}
            x={screenX + 7}
            y={y - 2}
            width={barW}
            height={4}
            rx={2}
            fill="url(#screenGlow2)"
            opacity={0.25 + 0.75 * p.intensity}
          />
        );
      })}

      <path d={`M${slitX},${centerY} L${screenX},${centerY}`} stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="6 8" />
      <text x={300} y={height - 28} fill="#cbd5e1" fontSize="14" fontWeight="800">
        aperture D = {round(D, 2)}, far-field condition L ≫ D; Fraunhofer scale ≈ 2D²/λ = {round(Lff, 1)}
      </text>
    </svg>
  );
}

export default function App() {
  const [params, setParams] = useState({
    numSlits: 2,
    spacing: 1.4,
    wavelength: 0.72,
    angleMaxDeg: 35,
    animationSpeed: 1.0,
  });

  const [tick, setTick] = useState(0);
  const [viewMode, setViewMode] = useState("amplitude");

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
      spacing: 1.4,
      wavelength: 0.72,
      angleMaxDeg: 35,
      animationSpeed: 1.0,
    });
    setViewMode("amplitude");
  }

  function singleSlitLike() {
    setParams({ numSlits: 1, spacing: 1.4, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
  }

  function classicDoubleSlit() {
    setParams({ numSlits: 2, spacing: 1.4, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
  }

  function gratingDemo() {
    setParams({ numSlits: 7, spacing: 1.25, wavelength: 0.72, angleMaxDeg: 35, animationSpeed: 1.0 });
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
              Each slit contributes a complex field. The final measurable intensity is obtained only after the complex amplitudes are summed.
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
                The observation plane is fixed in the far-field approximation. The far-field condition is checked against the aperture size.
              </p>
            </div>

            <SliderCard
              label="Number of slits"
              hint="2 gives the classic double-slit response. More slits approach a grating response."
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
              hint="Only changes the speed of the moving illustration."
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
                The plotted intensity uses the far-field angular variable θ directly.
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
                  <h2>{viewMode === "amplitude" ? "Figure 1 — total complex amplitude" : "Figure 1 — moving wavefronts"}</h2>
                  <p>
                    {viewMode === "amplitude"
                      ? "This mode shows the field amplitude pattern after the slits. It is closer to the wave-optics interference image: the complex field is summed before intensity is calculated."
                      : "This mode shows Huygens-style secondary wavefronts from each slit and the fixed far-field observation plane."}
                  </p>
                </div>

                <div className="mode-toggle">
                  <button className={viewMode === "amplitude" ? "btn" : "btn secondary"} onClick={() => setViewMode("amplitude")}>
                    Amplitude map
                  </button>
                  <button className={viewMode === "wavefronts" ? "btn" : "btn secondary"} onClick={() => setViewMode("wavefronts")}>
                    Wavefront lines
                  </button>
                </div>
              </div>

              <div className="canvas-wrap">
                {viewMode === "amplitude"
                  ? <AmplitudeMapSVG params={params} tick={tick} />
                  : <WavefrontSVG params={params} tick={tick} />}
              </div>

              <div className="legend">
                {viewMode === "amplitude" ? (
                  <>
                    <span className="legend-item"><span className="dot blue-dot" /> positive real field</span>
                    <span className="legend-item"><span className="dot red-dot" /> negative real field</span>
                    <span className="legend-item"><span className="dot amber-dot" /> slit sources</span>
                  </>
                ) : (
                  <>
                    <span className="legend-item"><span className="dot blue-dot" /> incident plane wave</span>
                    <span className="legend-item"><span className="dot violet-dot" /> secondary wavefronts</span>
                    <span className="legend-item"><span className="dot amber-dot" /> bright far-field regions</span>
                  </>
                )}
              </div>
            </motion.div>

            <div className="two-col">
              <div className="panel glass">
                <div className="panel-head">
                  <div>
                    <h2>Far-field intensity pattern</h2>
                    <p>
                      The horizontal axis is angle θ. The plot uses the N-slit array factor and is independent of a near-field screen distance.
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
                  Each slit contributes a complex phasor. The phasors are summed first.
                </p>

                <div className="eq">
                  E(θ) = Σ<sub>m=1</sub><sup>N</sup> A<sub>m</sub> exp[j k y<sub>m</sub> sin(θ)]
                </div>

                <p>The measured brightness is proportional to the squared magnitude of the total complex amplitude.</p>

                <div className="eq">
                  I(θ) = |E(θ)|², &nbsp;&nbsp; k = 2π / λ
                </div>

                <p>
                  For maxima, neighbouring slits must differ in path length by an integer number of wavelengths:
                </p>

                <div className="eq">
                  d sin(θ) = n λ, &nbsp;&nbsp; n = 0, ±1, ±2, ...
                </div>

                <p>Equivalently:</p>

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
                  <strong>2. Slits act as sources</strong>
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
              <Concept icon={<Waves size={18} />} title="Why one shared frequency?">
                The incident wave is monochromatic, so every slit radiates at the same frequency. The interference pattern is controlled by phase differences caused by path length differences.
              </Concept>

              <Concept icon={<MoveHorizontal size={18} />} title="What does changing slit distance do?">
                Increasing d changes the angular spacing of the maxima. The condition d sin θ = nλ shows that larger spacing moves maxima closer together in angle.
              </Concept>

              <Concept icon={<Eye size={18} />} title="Why force the far-field observation?">
                The standard double-slit equation is a far-field angular result. Using θ directly avoids confusing it with near-field propagation from a finite screen distance.
              </Concept>

              <Concept icon={<Sparkles size={18} />} title="Amplitude before intensity">
                The complex amplitudes add first. Only after summing the field do we calculate intensity using I = |E|².
              </Concept>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
