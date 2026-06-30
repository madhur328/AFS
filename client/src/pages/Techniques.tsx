import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api, Technique } from '../lib/api';
import { Panel, Button } from '../components/ui';
import GenesisBanner from '../components/GenesisBanner';

export default function Techniques() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [pomoActive, setPomoActive] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [aspectFocus, setAspectFocus] = useState('Unwavering Heart');
  const interval = useRef<number>();

  useEffect(() => {
    api.techniques().then(setTechniques);
    return () => clearInterval(interval.current);
  }, []);

  useEffect(() => {
    if (!pomoActive) return;
    interval.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          const next = phase === 'focus' ? 5 * 60 : 25 * 60;
          setPhase(phase === 'focus' ? 'break' : 'focus');
          if (phase === 'focus') {
            api.logPomodoro({ focus_min: 25, break_min: 5, cycles: 1, aspect_focus: aspectFocus });
          }
          return next;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval.current);
  }, [pomoActive, phase, aspectFocus]);

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Techniques</h1>
        <p className="text-forge-muted">
          Pomodoro Forge · Feynman Clarity Drill ·{' '}
          <Link to="/grok?type=EOT" className="text-forge-ember hover:underline">Quick EOT (genesis)</Link>
        </p>
      </header>
      <GenesisBanner compact />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Pomodoro Forge" subtitle={`${phase === 'focus' ? 'Focus' : 'Break'} phase`}>
          <div className="text-center">
            <p className="font-display text-6xl font-bold text-forge-cyan">
              {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </p>
            <input
              value={aspectFocus}
              onChange={(e) => setAspectFocus(e.target.value)}
              className="mt-4 rounded-lg border border-forge-border bg-forge-bg px-3 py-2 text-sm"
              placeholder="Aspect focus..."
            />
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => setPomoActive(!pomoActive)} variant={pomoActive ? 'ghost' : 'primary'}>
                {pomoActive ? 'Pause' : 'Start Forge'}
              </Button>
              <Button onClick={() => { setPomoActive(false); setSeconds(25 * 60); setPhase('focus'); }} variant="ghost">Reset</Button>
            </div>
          </div>
        </Panel>

        <Panel title="All Techniques">
          {techniques.map((t) => (
            <div key={t.id} className="mb-4 rounded-xl border border-forge-border p-4">
              <h3 className="font-mono text-forge-cyan">{t.code}</h3>
              <p className="font-medium">{t.name}</p>
              <p className="mt-1 text-sm text-forge-muted">{t.description}</p>
              {t.code === 'feynman' && (
                <ol className="mt-2 list-decimal pl-4 text-xs text-forge-muted">
                  {(t.config as { steps: string[] }).steps?.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              )}
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}