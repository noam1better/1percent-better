'use client';

import { useEffect, useState } from 'react';
import type { StatusData } from './api/status/route';

export default function StatusBadge() {
  const [status, setStatus] = useState<StatusData | null>(null);

  const poll = () =>
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ running: false, port: 3001, checkedAt: new Date().toISOString() }));

  useEffect(() => {
    poll();
    const id = setInterval(poll, 10_000);
    return () => clearInterval(id);
  }, []);

  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
        <span className="w-2 h-2 rounded-full bg-gray-500" />
        Checking…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
        status.running
          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
          : 'bg-red-900/40 text-red-300 border border-red-700/50'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${status.running ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}
      />
      {status.running ? `Agent running · port ${status.port}` : 'Agent offline'}
    </span>
  );
}
