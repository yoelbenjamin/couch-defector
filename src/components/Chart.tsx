export interface Point {
  x: number
  y: number
  label: string
  step?: number
}

/** Inline SVG line chart. Dashed guides mark where the step changed. */
export default function Chart({ points, height = 140, unit = '' }: { points: Point[]; height?: number; unit?: string }) {
  if (points.length === 0) return <div className="py-8 text-center text-sm text-muted-foreground">No sessions yet.</div>
  const w = 320
  const padL = 28
  const padR = 8
  const padT = 10
  const padB = 20
  const maxY = Math.max(5, ...points.map((p) => p.y))
  const n = points.length
  const xs = (i: number) => padL + (n === 1 ? (w - padL - padR) / 2 : (i * (w - padL - padR)) / (n - 1))
  const ys = (v: number) => padT + (height - padT - padB) * (1 - v / maxY)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(' ')
  const stepChanges = points.filter((p, i) => i > 0 && p.step !== points[i - 1].step)
  const ticks = [0, Math.round(maxY / 2), maxY]
  const primary = 'var(--primary)'
  const muted = 'var(--muted-foreground)'
  const grid = 'var(--border)'

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Progress chart">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w - padR} y1={ys(t)} y2={ys(t)} stroke={grid} strokeWidth="1" />
          <text x={padL - 6} y={ys(t) + 3} fontSize="9" fill={muted} textAnchor="end">
            {t}
            {unit}
          </text>
        </g>
      ))}
      {stepChanges.map((p) => (
        <g key={p.x}>
          <line x1={xs(p.x)} x2={xs(p.x)} y1={padT} y2={height - padB} stroke={primary} strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />
          <text x={xs(p.x) + 3} y={padT + 8} fontSize="9" fill={primary}>
            step {p.step}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke={primary} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xs(i)} cy={ys(p.y)} r="3.5" fill="var(--card)" stroke={primary} strokeWidth="2" />
      ))}
      {[...new Set([0, n - 1])].map((i) => (
        <text key={i} x={xs(i)} y={height - 6} fontSize="9" fill={muted} textAnchor={i === 0 ? 'start' : 'end'}>
          {points[i].label}
        </text>
      ))}
    </svg>
  )
}
