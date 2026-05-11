
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Atom, Eye, MoveHorizontal, RotateCcw, Sparkles, Waves } from "lucide-react";
import { InlineMath, BlockMath } from "react-katex";
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

function computeIntensityPattern({ numSlits, spacing, wavelength, screenDistance, screenHeight }) {
  const yMin = -screenHeight / 2;
  const yMax = screenHeight / 2;
  const slits = slitPositions(numSlits, spacing);
  const k = TWO_PI / wavelength;
  const out = [];

  let maxI = 1e-12;

  for (let i = 0; i < 420; i++) {
    const y = yMin + (i / 419) * (yMax - yMin);
    let re = 0;
    let im = 0;

    for (const ys of slits) {
      const r = Math.sqrt(screenDistance * screenDistance + (y - ys) * (y - ys));
      const amp = 1 / Math.sqrt(r);
      re += amp * Math.cos(k * r);
      im += amp * Math.sin(k * r);
    }

    const raw = re * re + im * im;
    maxI = Math.max(maxI, raw);
    out.push({ y, raw });
  }

  return out.map((p) => ({
    y: round(p.y, 3),
    intensity: round(p.raw / maxI, 4),
  }));
}

function WavefrontSVG({ params, tick }) {
  const width = 1000;
  const height = 560;
  const slitX = 120;
  const screenX = 120 + params.screenDistance * 120;
  const centerY = height / 2;
  const pxPerUnit = 70;
  const slitYs = slitPositions(params.numSlits, params.spacing).map((s) => centerY + s * pxPerUnit);
  const wavelengthPx = params.wavelength * pxPerUnit;
  const phaseShift = (tick * params.frequency * 9) % wavelengthPx;
  const rings = [];

  for (const y of slitYs) {
    for (let r = phaseShift; r < 1050; r += wavelengthPx) {
      if (r > 8) rings.push({ x: slitX, y, r });
    }
  }

  const barrierTop = 0;
  const barrierBottom = height;
  const slitHalfHeight = 12;

  const barrierSegments = [];
  let last = barrierTop;
  const sortedYs = [...slitYs].sort((a, b) => a - b);
  for (const y of sortedYs) {
    barrierSegments.push({ y1: last, y2: Math.max(last, y - slitHalfHeight) });
    last = Math.min(barrierBottom, y + slitHalfHeight);
  }
  barrierSegments.push({ y1: last, y2: barrierBottom });

  const intensity = computeIntensityPattern(params);
  const bars = intensity.filter((_, i) => i % 4 === 0);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Moving wavefront diagram">
      <defs>
        <linearGradient id="screenGlow" x1="0" x2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.75" />
        </linearGradient>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={width} height={height} fill="#020617" />

      {/* incoming shared-frequency plane waves */}
      {Array.from({ length: 9 }).map((_, idx) => {
        const x = slitX - 30 - ((idx * wavelengthPx + phaseShift) % 420);
        return (
          <line
            key={`plane-${idx}`}
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke="#38bdf8"
            strokeWidth="2"
            opacity="0.36"
          />
        );
      })}

      <text x="28" y="38" fill="#bae6fd" fontWeight="800" fontSize="18">shared-frequency plane wave</text>

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
      <text x={slitX - 42} y={height - 18} fill="#e2e8f0" fontWeight="800" fontSize="15">slits</text>

      {/* outgoing circular wavefronts */}
      <g filter="url(#softGlow)">
        {rings.map((ring, idx) => (
          <circle
            key={`ring-${idx}`}
            cx={ring.x}
            cy={ring.y}
            r={ring.r}
            fill="none"
            stroke={idx % 2 === 0 ? "#8b5cf6" : "#22d3ee"}
            strokeWidth="2.2"
            opacity={clamp(0.62 - ring.r / 1200, 0.08, 0.62)}
          />
        ))}
      </g>

      {/* slit labels */}
      {slitYs.map((y, idx) => (
        <g key={`slit-label-${idx}`}>
          <circle cx={slitX} cy={y} r="5" fill="#f59e0b" />
          <text x={slitX + 16} y={y + 5} fill="#fde68a" fontSize="13" fontWeight="800">
            S{idx + 1}
          </text>
        </g>
      ))}

      {/* screen / observation plane */}
      <line x1={screenX} y1="0" x2={screenX} y2={height} stroke="#f8fafc" strokeWidth="3" strokeDasharray="8 8" />
      <text x={screenX + 12} y="34" fill="#fff7ed" fontWeight="800" fontSize="17">observation plane</text>

      {/* intensity strip on screen */}
      {bars.map((p, idx) => {
        const y = centerY + p.y * pxPerUnit;
        const barW = 8 + p.intensity * 90;
        return (
          <rect
            key={`screen-bar-${idx}`}
            x={screenX + 8}
            y={y - 2}
            width={barW}
            height={4}
            rx={2}
            fill="url(#screenGlow)"
            opacity={0.35 + 0.65 * p.intensity}
          />
        );
      })}

      {/* distance arrow */}
      <line x1={slitX} y1={height - 42} x2={screenX} y2={height - 42} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
      <text x={(slitX + screenX) / 2 - 48} y={height - 52} fill="#cbd5e1" fontSize="14" fontWeight="800">
        screen distance L
      </text>

      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
        </marker>
      </defs>
    </svg>
  );
}

export default function App() {
  const [params, setParams] = useState({
    numSlits: 2,
    spacing: 1.4,
    screenDistance: 5.2,
    screenHeight: 6.4,
    wavelength: 0.72,
    frequency: 1.0,
  });

  const [tick, setTick] = useState(0);

  React.useEffect(() => {
    const id = requestAnimationFrame(function loop() {
      setTick((t) => t + 1);
      requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const pattern = useMemo(() => computeIntensityPattern(params), [params]);

  function update(key, value) {
    setParams((old) => ({ ...old, [key]: value }));
  }

  function reset() {
    setParams({
      numSlits: 2,
      spacing: 1.4,
      screenDistance: 5.2,
      screenHeight: 6.4,
      wavelength: 0.72,
      frequency: 1.0,
    });
  }

  function singleSlitLike() {
    setParams({ numSlits: 1, spacing: 1.4, screenDistance: 5.2, screenHeight: 6.4, wavelength: 0.72, frequency: 1.0 });
  }

  function classicDoubleSlit() {
    setParams({ numSlits: 2, spacing: 1.4, screenDistance: 5.2, screenHeight: 6.4, wavelength: 0.72, frequency: 1.0 });
  }

  function gratingDemo() {
    setParams({ numSlits: 7, spacing: 1.25, screenDistance: 5.2, screenHeight: 6.4, wavelength: 0.72, frequency: 1.0 });
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
            <h1>One shared wave becomes bright and dark bands</h1>
            <p>
              A single-frequency plane wave reaches several slits. Each slit behaves like a new wave source.
              On the observation plane, waves can arrive together or opposite, creating bright and dark interference fringes.
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
                Keep the frequency shared. Change the slit geometry and observation plane to see the pattern move.
              </p>
            </div>

            <SliderCard
              label="Number of slits"
              hint="2 is the classic double-slit experiment. More slits make sharper bright bands."
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
              max={2.4}
              step={0.1}
              unit="units"
              onChange={(v) => update("spacing", v)}
            />

            <SliderCard
              label="Observation plane L"
              hint="Move the screen closer or farther away from the slits."
              value={params.screenDistance}
              min={2.5}
              max={7.0}
              step={0.1}
              unit="units"
              onChange={(v) => update("screenDistance", v)}
            />

            <SliderCard
              label="Observation height"
              hint="How much vertical screen range to display."
              value={params.screenHeight}
              min={3.0}
              max={8.0}
              step={0.1}
              unit="units"
              onChange={(v) => update("screenHeight", v)}
            />

            <SliderCard
              label="Shared wavelength λ"
              hint="One shared frequency means all slits emit waves with this same wavelength."
              value={params.wavelength}
              min={0.35}
              max={1.25}
              step={0.01}
              unit="units"
              onChange={(v) => update("wavelength", v)}
            />

            <SliderCard
              label="Animation frequency"
              hint="Only changes how fast the wavefronts move visually."
              value={params.frequency}
              min={0.2}
              max={2.5}
              step={0.1}
              unit="×"
              onChange={(v) => update("frequency", v)}
            />
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
                  <h2>Moving wavefronts</h2>
                  <p>
                    Blue lines are the incoming plane wave. Each slit launches circular wavefronts.
                    The screen shows where the interference becomes bright.
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
                <span className="legend-item"><span className="dot blue-dot" /> incoming shared wave</span>
                <span className="legend-item"><span className="dot violet-dot" /> wavefronts from slits</span>
                <span className="legend-item"><span className="dot amber-dot" /> bright screen regions</span>
              </div>
            </motion.div>

            <div className="two-col">
              <div className="panel glass">
                <div className="panel-head">
                  <div>
                    <h2>Observation-plane intensity</h2>
                    <p>
                      Peaks are bright fringes. Valleys are dark fringes. More slits usually make narrower peaks.
                    </p>
                  </div>
                  <span className="pill">screen pattern</span>
                </div>

                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={pattern} margin={{ top: 12, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="y" tickFormatter={(v) => round(v, 1)} label={{ value: "screen position y", position: "insideBottom", offset: -10 }} />
                      <YAxis domain={[0, 1.05]} label={{ value: "normalized intensity", angle: -90, position: "insideLeft" }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="intensity" name="brightness" stroke="#0f172a" fill="#38bdf8" fillOpacity={0.33} strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="equation-box">
                <h3>The equation behind the picture</h3>

                <div className="eq">
                  <BlockMath math={"E(y)=\\sum_{m=1}^{N} A_m e^{j k r_m(y)}"} />
                </div>

                <p>
                  Each slit contributes one wave. The total field on the screen is the sum of all slit contributions.
                </p>

                <div className="eq">
                  <BlockMath math={"I(y)=|E(y)|^2,\\qquad k=\\frac{2\\pi}{\\lambda}"} />
                </div>

                <p>
                  The screen brightness is proportional to the squared magnitude of the total field.
                  For far-field double slit maxima:
                </p>

                <div className="eq">
                  <BlockMath math={"d\\sin\\theta=m\\lambda"} />
                </div>

                <p>
                  Bright bands occur when the path difference between neighbouring slits is a whole number of wavelengths.
                </p>
              </div>
            </div>

            <div className="panel glass">
              <h2 className="section-title">How to explain it to secondary school students</h2>
              <div className="teacher-grid">
                <div className="teacher-step">
                  <strong>1. One wave arrives</strong>
                  Start by saying: “Imagine flat water waves travelling toward a wall with small gaps.”
                </div>
                <div className="teacher-step">
                  <strong>2. Each slit becomes a source</strong>
                  After passing through a slit, the wave spreads out like ripples from that opening.
                </div>
                <div className="teacher-step">
                  <strong>3. Waves add on the screen</strong>
                  If crest meets crest, it becomes bright. If crest meets trough, it becomes dark.
                </div>
                <div className="teacher-step">
                  <strong>4. More slits sharpen the pattern</strong>
                  A diffraction grating is just many slits. It makes stronger, narrower bright directions.
                </div>
              </div>
            </div>

            <div className="explain">
              <Concept icon={<Waves size={18} />} title="Why one shared frequency?">
                All slits are driven by the same incoming wave, so they share the same frequency and wavelength.
                The difference is not frequency — it is the path length from each slit to the observation point.
              </Concept>

              <Concept icon={<MoveHorizontal size={18} />} title="What does changing slit distance do?">
                Larger slit spacing makes the phase difference change faster with angle, so the fringe spacing changes.
                This is the key idea behind diffraction gratings.
              </Concept>

              <Concept icon={<Eye size={18} />} title="What does moving the observation plane do?">
                Moving the screen changes how the angular interference pattern maps into physical positions on the screen.
                A far screen makes the fringe pattern easier to see.
              </Concept>

              <Concept icon={<Sparkles size={18} />} title="The big idea">
                The experiment shows that light behaves like a wave: the final brightness is not from each slit alone,
                but from the superposition of all possible wave contributions.
              </Concept>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
