import React from 'react';
import { Flame, Zap } from 'lucide-react';

interface Props {
  spikeTest: boolean;
  onToggleSpike: (active: boolean) => void;
}

export const ChaosPanel: React.FC<Props> = ({ spikeTest, onToggleSpike }) => {
  return (
    <div className="bg-luxury-card p-5 rounded-xl border border-rose-900/30 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Engine de Chaos Engineering</h3>
            <p className="text-xs text-slate-400">Simule estresse extremo e valide o comportamento do cluster em tempo real.</p>
          </div>
        </div>

        <button
          onClick={() => onToggleSpike(!spikeTest)}
          className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition-all ${
            spikeTest 
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 animate-pulse'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <Zap className="w-4 h-4" />
          {spikeTest ? 'PARAR SPIKE TEST' : 'INICIAR SPIKE TEST (+300% RPM)'}
        </button>
      </div>
    </div>
  );
};
