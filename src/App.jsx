
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Atom, Eye, MoveHorizontal, RotateCcw, Sparkles, Waves } from "lucide-react";
import { BlockMath } from "react-katex";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TWO_PI = 2 * Math.PI;
const FAR_FIELD_L = 80; // model-space distance used for far-field angular pattern

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

/*
  Far-field N-slit array factor:
    E(theta) = sum_m exp(j k y_m sin(theta))
    I(theta) = |E(theta)|^2 / N^2
  This fixes the previous observation-plane plot because the x-axis is now the far-field angle.
*/
function computeFarFieldPattern({ numSlits, spacing, wavelength, angleMaxDeg }) {
  const slits = slitPositions(numSlits, spacing);
  const k = TWO_PI / wavelength;
  const out = [];

  for (let i = 0; i <= 500; i++) {
    const thetaDeg = -angleMaxDeg + (2 * angleMaxDeg * i) / 500;
    const theta = (thetaDeg * Math.PI) / 180;
    let re = 0;
    let im = 0;

    for (const y of slits) {
      const phase = k * y * Math.sin(theta);
      re += Math.cos(phase);
      im += Math.sin(phase);
    }

    const intensity = (re * re + im * im) / (numSlits * numSlits);
    out.push({
      theta: round(thetaDeg, 2),
      intensity: round(intensity, 4),
    });
  }

  return out;
}

/*
  Complex field map behind the slits:
    E(x,y,t) = sum_m exp(j(k r_m - omega t)) / sqrt(r_m)
  The plotted image uses Re{E}. Bright/dark colored lobes make the interference field visible.
*/
function ComplexAmplitudeFieldSVG({ params, tick }) {
  const width = 1000;
  const height = 600;
  const slitX = 115;
  const centerY = height / 2;
  const pxPerUnit = 74;
  const slits = slitPositions(params.numSlits, params.spacing);
  const slitYs = slits.map((s) => centerY + s * pxPerUnit);
  const k = TWO_PI / params.wavelength;
  const omegaT = tick * 0.13 * params.animationSpeed;

  const cols = 125;
  const rows = 74;
  const x0 = slitX + 12;
  const x1 = width - 70;
  const y0 = 35;
  const y1 = height - 35;
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
        const amp = 1 / Math.sqrt(Math.max(r, 0.08));
        const phase = k * r - omegaT;
        re += amp * Math.cos(phase);
        im += amp * Math.sin(phase);
      }

      const realNorm = Math.tanh(re / Math.sqrt(params.numSlits));
      const intensity = Math.min(1, Math.sqrt(re * re + im * im) / (1.8 * params.numSlits));
      const alpha = 0.17 + 0.83 * intensity;
      const color = realNorm >= 0
        ? `rgba(34,211,238,${alpha})`
        : `rgba(244,63,94,${alpha})`;

      cells.push({ x: px, y: py, w: dx + 0.3, h: dy + 0.3, color });
    }
  }

  const barrierSegments = [];
  let last = 0;
  const slitHalfHeight = 13;
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(height, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: height });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Total complex amplitude field">
      <rect width={width} height={height} fill="#020617" />
      <defs>
        <filter id="fieldGlow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* incident plane wave stripes */}
      {Array.from({ length: 12 }).map((_, idx) => {
        const lambdaPx = params.wavelength * pxPerUnit;
        const x = slitX - 20 - ((idx * lambdaPx + tick * 2.7 * params.animationSpeed) % 350);
        return (
          <rect
            key={`inc-${idx}`}
            x={x}
            y="0"
            width="7"
            height={height}
            fill={idx % 2 ? "#22d3ee" : "#f43f5e"}
            opacity="0.75"
          />
        );
      })}

      <g filter="url(#fieldGlow)">
        {cells.map((c, idx) => (
          <rect key={idx} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.color} />
        ))}
      </g>

      {/* Barrier */}
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
      <text x={slitX + 35} y="36" fill="#e0f2fe" fontWeight="850" fontSize="18">total complex amplitude: Re&#123;E&#125;</text>
      <text x="28" y={height - 20} fill="#cbd5e1" fontSize="14">
        cyan/red show opposite signs of the real field; brighter regions have stronger total amplitude.
      </text>
    </svg>
  );
}

function WavefrontSVG({ params, tick }) {
  const width = 1000;
  const height = 520;
  const slitX = 115;
  const screenX = 900; // fixed far observation plane in the drawing
  const centerY = height / 2;
  const pxPerUnit = 74;
  const slitYs = slitPositions(params.numSlits, params.spacing).map((s) => centerY + s * pxPerUnit);
  const wavelengthPx = params.wavelength * pxPerUnit;
  const phaseShift = (tick * params.animationSpeed * 2.5) % wavelengthPx;
  const rings = [];

  for (const y of slitYs) {
    for (let r = phaseShift; r < 1050; r += wavelengthPx) {
      if (r > 8) rings.push({ x: slitX, y, r });
    }
  }

  const barrierSegments = [];
  let last = 0;
  const slitHalfHeight = 13;
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(height, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: height });

  const pattern = computeFarFieldPattern(params);
  const bars = pattern.filter((_, i) => i % 5 === 0);
  const angleMaxRad = (params.angleMaxDeg * Math.PI) / 180;

  function thetaToY(thetaDeg) {
    const theta = (thetaDeg * Math.PI) / 180;
    return centerY + (theta / angleMaxRad) * (height * 0.45);
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Moving wavefront diagram">
      <defs>
        <linearGradient id="screenGlow2" x1="0" x2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.90" />
        </linearGradient>
        <filter id="softGlow2">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={width} height={height} fill="#020617" />

      {/* incoming shared-frequency plane waves */}
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

      <text x="28" y="35" fill="#bae6fd" fontWeight="800" fontSize="18">shared-frequency plane wave</text>

      {/* barrier with openings */}
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

      {/* outgoing circular wavefronts */}
      <g filter="url(#softGlow2)">
        {rings.map((ring, idx) => (
          <circle
            key={`ring-${idx}`}
            cx={ring.x}
            cy={ring.y}
            r={ring.r}
            fill="none"
            stroke={idx % 2 === 0 ? "#8b5cf6" : "#22d3ee"}
            strokeWidth="2.2"
            opacity={clamp(0.58 - ring.r / 1180, 0.06, 0.58)}
          />
        ))}
      </g>

      {slitYs.map((y, idx) => (
        <g key={`slit-label-${idx}`}>
          <circle cx={slitX} cy={y} r="5" fill="#f59e0b" />
          <text x={slitX + 16} y={y + 5} fill="#fde68a" fontSize="13" fontWeight="800">S{idx + 1}</text>
        </g>
      ))}

      {/* fixed far-field observation plane */}
      <line x1={screenX} y1="0" x2={screenX} y2={height} stroke="#f8fafc" strokeWidth="3" strokeDasharray="8 8" />
      <text x={screenX - 180} y="34" fill="#fff7ed" fontWeight="800" fontSize="17">far-field observation</text>

      {/* far-field intensity strip */}
      {bars.map((p, idx) => {
        const y = thetaToY(p.theta);
        const barW = 8 + p.intensity * 86;
        return (
          <rect
            key={`screen-bar-${idx}`}
            x={screenX + 8}
            y={y - 2}
            width={barW}
            height={4}
            rx={2}
            fill="url(#screenGlow2)"
            opacity={0.30 + 0.70 * p.intensity}
          />
        );
      })}

      <path d={`M${slitX},${centerY} L${screenX},${centerY}`} stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="6 8" />
      <text x={(slitX + screenX) / 2 - 70} y={height - 25} fill="#cbd5e1" fontSize="14" fontWeight="800">
        far-field screen is fixed in this model
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

  React.useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((t) => t + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pattern = useMemo(() => computeFarFieldPattern(params), [params]);

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
            <h1>One coherent wave becomes bright and dark interference bands</h1>
            <p>
              A monochromatic plane wave illuminates several slits. Each slit behaves as a coherent secondary source.
              In the far field, the measured intensity depends on the phase difference between contributions from the slits.
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
                The observation plane is fixed in the far-field approximation. Change the slit geometry and the shared wavelength.
              </p>
            </div>

            <SliderCard
              label="Number of slits"
              hint="2 gives the classic double-slit result. More slits approach a grating response."
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
              hint="Only changes the speed of the moving wavefront illustration."
              value={params.animationSpeed}
              min={0.2}
              max={2.5}
              step={0.1}
              unit="×"
              onChange={(v) => update("animationSpeed", v)}
            />

            <div className="equation-box">
              <h3>Far-field setting</h3>
              <p>
                The observation plane is not user-positioned here. The plot uses far-field angle θ directly,
                which is the standard form for the double-slit interference condition.
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
                  <h2>Figure 1 — moving wavefronts and far-field observation</h2>
                  <p>
                    A plane wave reaches the slits. Each slit launches a secondary wavefront.
                    The fixed far-field observation plane shows where constructive interference occurs.
                  </p>
                </div>
                <div className="pill">
                  N = {params.numSlits}, d = {params.spacing}, λ = {params.wavelength}
                </div>
              </div>

              <div className="canvas-wrap">
                <WavefrontSVG params={params} tick={tick} />
              </div>

              <div className="legend">
                <span className="legend-item"><span className="dot blue-dot" /> incoming plane wave</span>
                <span className="legend-item"><span className="dot violet-dot" /> secondary wavefronts</span>
                <span className="legend-item"><span className="dot amber-dot" /> bright far-field regions</span>
              </div>
            </motion.div>

            <div className="panel glass">
              <div className="panel-head">
                <div>
                  <h2>Figure 2 — total complex amplitude field</h2>
                  <p>
                    This field image shows the real part of the total complex amplitude after the slits.
                    The color sign alternates with phase, while the brightness shows stronger total amplitude.
                  </p>
                </div>
                <span className="pill">Re&#123;E&#125; field map</span>
              </div>

              <div className="canvas-wrap tall">
                <ComplexAmplitudeFieldSVG params={params} tick={tick} />
              </div>

              <div className="legend">
                <span className="legend-item"><span className="dot green-dot" /> bright = strong total field</span>
                <span className="legend-item"><span className="dot blue-dot" /> positive real field</span>
                <span className="legend-item"><span className="dot amber-dot" /> slit sources</span>
              </div>
            </div>

            <div className="two-col">
              <div className="panel glass">
                <div className="panel-head">
                  <div>
                    <h2>Far-field intensity pattern</h2>
                    <p>
                      The horizontal axis is angle θ. Maxima occur when the path difference between neighbouring slits is an integer multiple of the wavelength.
                    </p>
                  </div>
                  <span className="pill">I(θ)</span>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pattern} margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="theta" tickFormatter={(v) => round(v, 0)} label={{ value: "far-field angle θ in degrees", position: "insideBottom", offset: -10 }} />
                      <YAxis domain={[0, 1.05]} label={{ value: "normalized intensity", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="intensity" name="brightness" stroke="#0f172a" fill="#38bdf8" fillOpacity={0.33} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="equation-box">
                <h3>Classical wave-optics formulation</h3>

                <p>
                  The Huygens–Fresnel idea is that each point on a wavefront can be treated as a secondary source.
                  In this model, each slit contributes a complex phasor to the far-field point.
                </p>

                <div className="eq">
                  <BlockMath math={"E(\\theta)=\\sum_{m=1}^{N} A_m e^{j k y_m \\sin\\theta}"} />
                </div>

                <p>The measured intensity is proportional to the squared magnitude of the total complex amplitude.</p>

                <div className="eq">
                  <BlockMath math={"I(\\theta)=|E(\\theta)|^2,\\qquad k=\\frac{2\\pi}{\\lambda}"} />
                </div>

                <p>
                  For double-slit or grating maxima, the neighbouring-slit path difference is:
                </p>

                <div className="eq">
                  <BlockMath math={"d\\sin\\theta=n\\lambda,\\qquad n=0,\\pm1,\\pm2,\\ldots"} />
                </div>

                <p>
                  Equivalently, when the slit spacing is normalized by wavelength:
                </p>

                <div className="eq">
                  <BlockMath math={"\\sin\\theta_n=\\frac{n\\lambda}{d}"} />
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
                  <strong>2. Secondary sources</strong>
                  Each slit radiates a secondary wavelet with the same frequency as the incident wave.
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

              <Concept icon={<Eye size={18} />} title="Why fix the observation plane in the far field?">
                In the far field, the pattern is naturally described by angle θ instead of screen distance. This avoids mixing near-field propagation effects with the standard double-slit equation.
              </Concept>

              <Concept icon={<Sparkles size={18} />} title="Interference picture">
                The field map and the intensity plot show the same idea in different ways: complex amplitudes add first, then intensity is obtained from the magnitude squared.
              </Concept>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
