import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { SystemMetrics } from '../types/telemetry';

interface Props {
  data: SystemMetrics[];
}

export const TelemetryChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-luxury-card p-5 rounded-xl border border-slate-800 gold-border">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-slate-100">Throughput em Tempo Real (RPM)</h3>
          <p className="text-xs text-slate-500">Métrica agregada recebida via WebSockets</p>
        </div>
        <span className="text-xs text-luxury-gold font-mono border border-luxury-gold/30 px-2.5 py-1 rounded-full bg-luxury-gold/5">
          LIVE TELEMETRY
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" stroke="#64748B" fontSize={11} tickLine={false} />
            <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#D4AF37', borderRadius: '8px' }}
              itemStyle={{ color: '#E2E8F0' }}
            />
            <Area type="monotone" dataKey="totalRpm" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#goldGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
