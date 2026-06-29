import { useMemo, useState } from 'react';
import type { ScatterOut } from '@/schemas/supply';

interface HeatmapExplorerProps {
  data: ScatterOut;
  xLabel: string;
  yLabel: string;
  xUnit: string;
  yUnit: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
}

interface Bin {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  count: number;
  points: { name: string; x: number; y: number }[];
}

const X_BINS = 14;
const Y_BINS = 12;
const MARGIN = { top: 16, right: 16, bottom: 48, left: 56 };
const CELL_GAP = 1;

function defaultFormat(v: number): string {
  return v < 1 ? v.toFixed(2) : v.toFixed(1);
}

export default function HeatmapExplorer({ data, xLabel, yLabel, xUnit, yUnit, formatX, formatY }: HeatmapExplorerProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; bin: Bin } | null>(null);

  const { bins, xMin, xMax, yMin, yMax, maxCount, width, height, plotW, plotH } = useMemo(() => {
    const pts = data.points;
    if (pts.length === 0) {
      return { bins: [], xMin: 0, xMax: 1, yMin: 0, yMax: 1, maxCount: 0, width: 0, height: 0, plotW: 0, plotH: 0 };
    }

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);

    const xPad = (xMax - xMin) * 0.02 || 1;
    const yPad = (yMax - yMin) * 0.02 || 1;
    const xLo = xMin - xPad;
    const xHi = xMax + xPad;
    const yLo = yMin - yPad;
    const yHi = yMax + yPad;

    const xBinW = (xHi - xLo) / X_BINS;
    const yBinH = (yHi - yLo) / Y_BINS;

    const bins: Bin[] = [];
    const grid: number[][] = Array.from({ length: Y_BINS }, () => Array(X_BINS).fill(0));
    const binPoints: Bin['points'][][] = Array.from({ length: Y_BINS }, () =>
      Array.from({ length: X_BINS }, () => [])
    );

    for (const p of pts) {
      const xi = Math.min(Math.floor((p.x - xLo) / xBinW), X_BINS - 1);
      const yi = Math.min(Math.floor((p.y - yLo) / yBinH), Y_BINS - 1);
      grid[yi][xi]++;
      binPoints[yi][xi].push({ name: p.name, x: p.x, y: p.y });
    }

    let maxCount = 0;
    for (let yi = 0; yi < Y_BINS; yi++) {
      for (let xi = 0; xi < X_BINS; xi++) {
        if (grid[yi][xi] > maxCount) maxCount = grid[yi][xi];
        bins.push({
          xMin: xLo + xi * xBinW,
          xMax: xLo + (xi + 1) * xBinW,
          yMin: yLo + yi * yBinH,
          yMax: yLo + (yi + 1) * yBinH,
          count: grid[yi][xi],
          points: binPoints[yi][xi],
        });
      }
    }

    const width = 600;
    const height = 420;
    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = height - MARGIN.top - MARGIN.bottom;

    return { bins, xMin: xLo, xMax: xHi, yMin: yLo, yMax: yHi, maxCount, width, height, plotW, plotH };
  }, [data]);

  const fitLine = useMemo(() => {
    if (!data.linear_fit) return null;
    const { slope, intercept } = data.linear_fit;
    const yAtXMin = slope * xMin + intercept;
    const yAtXMax = slope * xMax + intercept;
    return { x1: xMin, y1: yAtXMin, x2: xMax, y2: yAtXMax };
  }, [data.linear_fit, data.pearson_r, xMin, xMax]);

  const toPlotX = (v: number) => MARGIN.left + ((v - xMin) / (xMax - xMin)) * plotW;
  const toPlotY = (v: number) => MARGIN.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  if (data.points.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Keine Daten verfügbar
      </div>
    );
  }

  const xTicks = 6;
  const yTicks = 6;
  const xStep = (xMax - xMin) / xTicks;
  const yStep = (yMax - yMin) / yTicks;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Pearson r:</span>
          <span className={`font-bold ${data.pearson_r !== null && Math.abs(data.pearson_r) > 0.5 ? 'text-primary' : 'text-foreground'}`}>
            {data.pearson_r?.toFixed(4) ?? '—'}
          </span>
        </div>
        {data.linear_fit && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">R²:</span>
              <span className="font-bold">{data.linear_fit.r_squared.toFixed(4)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Fit:</span>
              <span className="font-mono text-xs">
                y = {data.linear_fit.slope.toFixed(4)}x + {data.linear_fit.intercept.toFixed(2)}
              </span>
            </div>
          </>
        )}
        <span className="text-muted-foreground ml-auto">{data.count} Datenpunkte</span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-[28rem]">
          <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill="hsl(var(--muted))" rx={4} />

          {bins.map((bin, i) => {
            if (bin.count === 0) return null;
            const intensity = maxCount > 0 ? bin.count / maxCount : 0;
            const r = Math.round(22 + (1 - intensity) * 100);
            const g = Math.round(160 + (1 - intensity) * 60);
            const b = Math.round(80 + (1 - intensity) * 120);
            const x = toPlotX(bin.xMin);
            const y = toPlotY(bin.yMax);
            const w = (toPlotX(bin.xMax) - toPlotX(bin.xMin)) - CELL_GAP;
            const h = (toPlotY(bin.yMin) - toPlotY(bin.yMax)) - CELL_GAP;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={w}
                height={h}
                fill={`rgb(${r}, ${g}, ${b})`}
                opacity={0.15 + intensity * 0.75}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).closest('svg')!.getBoundingClientRect();
                  setTooltip({
                    x: (e.clientX - rect.left) / rect.width * width,
                    y: (e.clientY - rect.top) / rect.height * height,
                    bin,
                  });
                }}
                onMouseLeave={() => setTooltip(null)}
                className="cursor-crosshair"
              />
            );
          })}

          {fitLine && (
            <line
              x1={toPlotX(fitLine.x1)}
              y1={toPlotY(fitLine.y1)}
              x2={toPlotX(fitLine.x2)}
              y2={toPlotY(fitLine.y2)}
              stroke="#ef4444"
              strokeWidth={2.5}
              strokeDasharray="6 3"
            />
          )}

          {Array.from({ length: xTicks + 1 }, (_, i) => {
            const v = xMin + i * xStep;
            const px = toPlotX(v);
            const fmt = formatX ?? defaultFormat;
            return (
              <g key={`xt-${i}`}>
                <line x1={px} y1={MARGIN.top} x2={px} y2={MARGIN.top + plotH} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
                <text x={px} y={MARGIN.top + plotH + 18} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={10}>
                  {fmt(v)}
                </text>
              </g>
            );
          })}

          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const v = yMin + i * yStep;
            const py = toPlotY(v);
            const fmt = formatY ?? defaultFormat;
            return (
              <g key={`yt-${i}`}>
                <line x1={MARGIN.left} y1={py} x2={MARGIN.left + plotW} y2={py} stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.3} />
                <text x={MARGIN.left - 8} y={py + 3} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={10}>
                  {fmt(v)}
                </text>
              </g>
            );
          })}

          <text x={MARGIN.left + plotW / 2} y={height - 4} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
            {xLabel} ({xUnit})
          </text>
          <text x={12} y={MARGIN.top + plotH / 2} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11} transform={`rotate(-90, 12, ${MARGIN.top + plotH / 2})`}>
            {yLabel} ({yUnit})
          </text>

          {fitLine && (
            <g>
              <rect x={MARGIN.left + plotW - 120} y={MARGIN.top + 4} width={116} height={20} rx={4} fill="hsl(var(--background))" opacity={0.85} />
              <line x1={MARGIN.left + plotW - 114} y1={MARGIN.top + 14} x2={MARGIN.left + plotW - 90} y2={MARGIN.top + 14} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />
              <text x={MARGIN.left + plotW - 84} y={MARGIN.top + 17} fill="hsl(var(--muted-foreground))" fontSize={10}>
                Linearer Fit
              </text>
            </g>
          )}
        </svg>

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-popover text-popover-foreground rounded-lg border shadow-md px-3 py-2 text-xs space-y-1 z-50"
            style={{
              left: Math.min(tooltip.x / width * 100, 75) + '%',
              top: Math.max(tooltip.y / height * 100 - 10, 0) + '%',
              transform: 'translate(-50%, -100%)',
            }}
          >
            <div className="font-medium">
              {(formatX ?? defaultFormat)(tooltip.bin.xMin)}–{(formatX ?? defaultFormat)(tooltip.bin.xMax)} {xUnit} × {(formatY ?? defaultFormat)(tooltip.bin.yMin)}–{(formatY ?? defaultFormat)(tooltip.bin.yMax)} {yUnit}
            </div>
            <div>{tooltip.bin.count} Zutat{tooltip.bin.count !== 1 ? 'en' : ''}</div>
            {tooltip.bin.points.length > 0 && (
              <div className="text-muted-foreground max-w-48 truncate">
                {tooltip.bin.points.slice(0, 3).map((p) => p.name).join(', ')}
                {tooltip.bin.points.length > 3 && ` +${tooltip.bin.points.length - 3} weitere`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
