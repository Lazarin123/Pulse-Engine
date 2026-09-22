import React, { useEffect, useState } from 'react';
import { MicroserviceNode, SystemMetrics, LogEntry, ChaosState } from './types/telemetry';
import { ServiceNodeCard } from './components/ServiceNodeCard';
import { TelemetryChart } from './components/TelemetryChart';
import { LiveLogStream } from './components/LiveLogStream';
import { ChaosPanel } from './components/ChaosPanel';
import { Activity, Shield, Server, Gauge, Radio } from 'lucide-react';

const API_URL = 'http://localhost:4000';
const WS_URL = 'ws://localhost:4000';

export const App: React.FC = () => {
  const [nodes, setNodes] = useState<MicroserviceNode[]>([]);
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chaosState, setChaosState] = useState<ChaosState>({ spikeTest: false, offlineNodes: [] });
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);

      if (payload.type === 'INIT_STATE') {
        setChaosState(payload.chaosState);
      }

      if (payload.type === 'TELEMETRY_UPDATE') {
        const { nodes: updatedNodes, metrics, log } = payload.data;
        setNodes(updatedNodes);
        setChaosState(payload.chaosState);

        setMetricsHistory((prev) => [...prev.slice(-20), metrics]);
        setLogs((prev) => [log, ...prev.slice(0, 49)]);
      }
    };

    return () => ws.close();
  }, []);

  const handleToggleOffline = async (nodeId: string) => {
    await fetch(`${API_URL}/api/chaos/toggle-node`, {
      method: 'POST',
      headers: { 'Content-[#Type]': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeId })
    });
  };

  const handleToggleSpike = async (active: boolean) => {
    await fetch(`${API_URL}/api/chaos/spike-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    });
  };

  const currentMetrics = metricsHistory[metricsHistory.length - 1];

  return (
    <div className="min-h-screen bg-luxury-bg text-slate-100 p-6 md:p-10">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-luxury-gold/10 border border-luxury-gold/30 rounded-lg text-luxury-gold">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-slate-100 font-mono">
              PULSE<span className="text-luxury-gold">ENGINE</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400">Plataforma de Observabilidade & Telemetria em Tempo Real</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
            <span className="text-slate-400">WebSocket:</span>
            <span className="font-mono font-bold">{isConnected ? 'CONECTADO' : 'DESCONECTADO'}</span>
          </div>
        </div>
      </header>

      {/* High Level Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-luxury-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Throughput Global</span>
            <Gauge className="w-4 h-4 text-luxury-gold" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">{currentMetrics?.totalRpm || 0} <span className="text-xs font-normal text-slate-500">RPM</span></p>
        </div>

        <div className="bg-luxury-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Latência Média</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">{currentMetrics?.avgLatency || 0} <span className="text-xs font-normal text-slate-500">ms</span></p>
        </div>

        <div className="bg-luxury-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Taxa de Erros</span>
            <Shield className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">{currentMetrics?.errorRate || 0}%</p>
        </div>

        <div className="bg-luxury-card p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Nós Ativos</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100">{currentMetrics?.activeNodes || 0} / {nodes.length}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="space-y-8">
        <ChaosPanel spikeTest={chaosState.spikeTest} onToggleSpike={handleToggleSpike} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Microserviços Monitorados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nodes.map((node) => (
                <ServiceNodeCard key={node.id} node={node} onToggleOffline={handleToggleOffline} />
              ))}
            </div>
            <TelemetryChart data={metricsHistory} />
          </div>

          <div className="space-y-6">
            <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Stream de Telemetria</h2>
            <LiveLogStream logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;