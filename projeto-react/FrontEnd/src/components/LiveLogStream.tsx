import React from 'react';
import { LogEntry } from '../types/telemetry';
import { Terminal } from 'lucide-react';

interface Props {
  logs: LogEntry[];
}

export const LiveLogStream: React.FC<Props> = ({ logs }) => {
  return (
    <div className="bg-luxury-card p-5 rounded-xl border border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-luxury-gold" />
          <h3 className="font-bold text-slate-100 text-sm">Streaming de Audit Logs</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono">{logs.length} eventos</span>
      </div>

      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 h-48 overflow-y-auto font-mono text-xs space-y-1.5">
        {logs.length === 0 ? (
          <p className="text-slate-600 italic">Aguardando eventos do cluster...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 border-b border-slate-900 pb-1">
              <span className="text-slate-500 shrink-0">{log.timestamp.split('T')[1].slice(0, 8)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                log.level === 'WARN' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                {log.level}
              </span>
              <span className="text-slate-400 shrink-0">[{log.service}]</span>
              <span className="text-slate-200 truncate">{log.message}</span>
              <span className="text-slate-600 ml-auto shrink-0 font-sans text-[10px]">{log.traceId}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
