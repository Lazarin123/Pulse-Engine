import React from 'react';
import { MicroserviceNode } from '../types/telemetry';
import { Activity, Cpu, HardDrive, AlertTriangle, ShieldCheck, Power } from 'lucide-react';

interface Props {
  node: MicroserviceNode;
  onToggleOffline: (id: string) => void;
}

export const ServiceNodeCard: React.FC<Props> = ({ node, onToggleOffline }) => {
  const getStatusBadge = () => {
    switch (node.status) {
      case 'healthy':
        return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"><ShieldCheck className="w-3 h-3" /> Saudável</span>;
      case 'degraded':
        return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30"><AlertTriangle className="w-3 h-3" /> Degradado</span>;
      case 'critical':
        return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30"><AlertTriangle className="w-3 h-3" /> Crítico</span>;
      case 'offline':
        return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30"><Power className="w-3 h-3" /> Offline</span>;
    }
  };

  return (
    <div className={`p-5 rounded-xl bg-luxury-card border transition-all duration-300 ${node.status === 'offline' ? 'opacity-50 border-gray-800' : 'luxury-border hover:border-luxury-gold/50'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">{node.name}</h3>
          <span className="text-xs text-slate-500 font-mono">{node.id} • {node.region}</span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Cpu className="w-3.5 h-3.5 text-luxury-gold" /> CPU
          </div>
          <p className="text-lg font-bold font-mono text-slate-100">{node.cpu}%</p>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div className={`h-full transition-all duration-500 ${node.cpu > 80 ? 'bg-rose-500' : 'bg-luxury-gold'}`} style={{ width: `${node.cpu}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> Memória
          </div>
          <p className="text-lg font-bold font-mono text-slate-100">{node.memory}%</p>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: `${node.memory}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
        <div>
          <span>Latência: </span>
          <strong className="text-slate-200 font-mono">{node.latency}ms</strong>
        </div>
        <div>
          <span>RPM: </span>
          <strong className="text-slate-200 font-mono">{node.rpm}</strong>
        </div>
        <button
          onClick={() => onToggleOffline(node.id)}
          className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 border ${
            node.status === 'offline' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
          }`}
        >
          <Power className="w-3 h-3" />
          {node.status === 'offline' ? 'Reativar' : 'Derrubar'}
        </button>
      </div>
    </div>
  );
};
