import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';

interface Props {
  compact?: boolean;
  sessionCount?: number;
  conversationCount?: number;
}

export default function GenesisBanner({ compact, sessionCount, conversationCount }: Props) {
  if (compact) {
    return (
      <Link
        to="/grok"
        className="inline-flex items-center gap-2 rounded-lg border border-forge-ember/30 bg-forge-ember/5 px-3 py-1.5 text-xs text-forge-ember hover:border-forge-ember/50"
      >
        <ScrollText size={14} />
        Grok Origin Thread
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-forge-ember/25 bg-gradient-to-r from-forge-ember/10 via-transparent to-forge-leaf/10 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-forge-ember">Genesis Source</p>
          <p className="mt-1 text-sm text-forge-muted">
            Fallen Valkyrie → AFP → EOT → Base Layer
            {sessionCount != null && ` — ${sessionCount.toLocaleString()} sessions`}
            {conversationCount != null && conversationCount > 1 && ` · ${conversationCount} threads`}
          </p>
        </div>
        <Link
          to="/grok"
          className="inline-flex items-center gap-2 rounded-lg border border-forge-ember/40 bg-forge-ember/15 px-4 py-2 text-sm text-forge-ember hover:bg-forge-ember/25"
        >
          <ScrollText size={16} />
          Open Grok Origin
        </Link>
      </div>
    </div>
  );
}