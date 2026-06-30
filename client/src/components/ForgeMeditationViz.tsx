import { useEffect, useRef } from 'react';

export interface MeditationVisual {
  primary: string;
  glow: string;
  gradient: string[];
  breath: string;
  aura: string;
  prompt: string;
}

function parseBreath(pattern: string) {
  const parts = pattern.split('-').map(Number);
  return {
    inhale: parts[0] || 4,
    hold: parts[1] || 4,
    exhale: parts[2] || 6,
  };
}

export default function ForgeMeditationViz({
  visual,
  active,
}: {
  visual: MeditationVisual | null;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !visual || !active) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const breath = parseBreath(visual.breath);
    const cycleSec = breath.inhale + breath.hold + breath.exhale;
    let start = performance.now();

    const draw = (now: number) => {
      const elapsed = ((now - start) / 1000) % cycleSec;
      let phase = 0;
      let t = 0;
      if (elapsed < breath.inhale) {
        phase = 0;
        t = elapsed / breath.inhale;
      } else if (elapsed < breath.inhale + breath.hold) {
        phase = 1;
        t = 1;
      } else {
        phase = 2;
        t = 1 - (elapsed - breath.inhale - breath.hold) / breath.exhale;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.22;
      const r = baseR * (0.65 + t * 0.45);

      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.4);
      grad.addColorStop(0, visual.glow);
      grad.addColorStop(0.45, visual.primary);
      grad.addColorStop(1, visual.gradient[0] || '#020810');

      ctx.fillStyle = visual.gradient[1] || '#0a1420';
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.35 + t * 0.45;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = visual.glow;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      const label =
        phase === 0 ? 'Inhale' : phase === 1 ? 'Hold' : 'Exhale';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${label} · ${visual.breath}`, cx, h - 12);

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [visual, active]);

  if (!visual) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-forge-border bg-black/50">
      <canvas ref={canvasRef} width={320} height={160} className="h-40 w-full" />
      <p className="border-t border-forge-border/60 px-3 py-2 text-xs italic text-forge-muted">
        {visual.prompt}
      </p>
    </div>
  );
}