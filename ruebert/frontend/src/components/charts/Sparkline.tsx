import type { TrafficColor } from '@/components/layout/SidebarControls';

export function Sparkline({ values, colour }: { values: number[]; colour: TrafficColor }) {
  const max = Math.max(1, ...values);
  const fill: Record<TrafficColor, string> = {
    red: 'hsl(var(--traffic-red))',
    yellow: 'hsl(var(--traffic-yellow))',
    green: 'hsl(var(--traffic-green))',
    blue: 'hsl(var(--traffic-blue))',
  };
  return (
    <svg viewBox={`0 0 ${values.length * 6} 24`} className="h-6 w-full max-w-[96px]" role="img" aria-label="Verlauf der letzten Wochen" preserveAspectRatio="none">
      {values.map((value, index) => {
        const height = Math.max(1, (value / max) * 22);
        return <rect key={index} x={index * 6} y={24 - height} width={4} height={height} fill={fill[colour]} opacity={0.85} />;
      })}
    </svg>
  );
}
