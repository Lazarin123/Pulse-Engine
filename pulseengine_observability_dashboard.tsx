import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  Server,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  Terminal,
  Cpu,
  HardDrive,
  Clock,
  Download,
  Flame,
  ShieldAlert,
  Search,
  Filter,
  X,
  Sliders,
  Layers,
  BarChart2,
  Radio,
  Globe,
  Database,
  Lock,
  PieChart
} from 'lucide-react';

// --- TYPES & INTERFACES ---
type NodeStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'HIGH_LOAD';

interface ServiceNode {
  id: string;
  name: string;
  category: 'GATEWAY' | 'AUTH' | 'PAYMENT' | 'WORKER' | 'DATABASE' | 'CACHE';
  status: NodeStatus;
  cpu: number; // percentage
  memory: number; // percentage
  latency: number; // ms
  errorRate: number; // percentage
  rps: number; // requests per second
  uptime: number; // seconds
  version: string;
  instances: number;
}

interface TelemetryFrame {
  timestamp: number;
  totalRps: number;
  avgLatency: number;
  errorCount: number;
  cpuAverage: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  payload?: Record<string, any>;
}

// Initial Fleet Node Configuration
const INITIAL_NODES: ServiceNode[] = [
  { id: 'node-gateway', name: 'API Gateway', category: 'GATEWAY', status: 'HEALTHY', cpu: 32, memory: 45, latency: 18, errorRate: 0.02, rps: 4200, uptime: 124500, version: 'v2.4.1', instances: 4 },
  { id: 'node-auth', name: 'Auth Microservice', category: 'AUTH', status: 'HEALTHY', cpu: 28, memory: 52, latency: 24, errorRate: 0.01, rps: 1800, uptime: 98200, version: 'v1.9.0', instances: 3 },
  { id: 'node-payment', name: 'Payment Engine', category: 'PAYMENT', status: 'HEALTHY', cpu: 41, memory: 61, latency: 85, errorRate: 0.05, rps: 850, uptime: 45000, version: 'v3.1.2', instances: 2 },
  { id: 'node-worker', name: 'Analytics Worker', category: 'WORKER', status: 'HEALTHY', cpu: 55, memory: 78, latency: 140, errorRate: 0.12, rps: 620, uptime: 310000, version: 'v1.2.4', instances: 6 },
  { id: 'node-db', name: 'Database Cluster', category: 'DATABASE', status: 'HEALTHY', cpu: 48, memory: 82, latency: 12, errorRate: 0.00, rps: 3400, uptime: 540000, version: 'v15.2.0', instances: 3 },
  { id: 'node-cache', name: 'Redis Cache Mesh', category: 'CACHE', status: 'HEALTHY', cpu: 19, memory: 38, latency: 3, errorRate: 0.00, rps: 5100, uptime: 890000, version: 'v7.0.1', instances: 2 },
];

// High performance custom Canvas/SVG real-time line chart to avoid extra chart library lag
const RealtimeAreaChart: React.FC<{ data: number[]; maxVal: number; color: string; label: string; unit: string }> = ({
  data,
  maxVal,
  color,
  label,
  unit
}) => {
  const width = 320;
  const height = 90;
  
  if (!data || data.length < 2) return <div className="h-[90px] flex items-center justify-center text-xs text-slate-500">Buffering telemetry...</div>;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const normalizedVal = Math.min(Math.max(val, 0), maxVal);
    const y = height - (normalizedVal / maxVal) * (height - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  const strokeD = `M ${points.join(' L ')}`;
  const currentVal = data[data.length - 1] || 0;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-sm font-mono font-bold" style={{ color }}>
          {currentVal.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{unit}</span>
        </span>
      </div>
      <div className="relative w-full overflow-hidden h-[60px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full preserve-3d" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={pathD} fill={`url(#grad-${label.replace(/\s+/g, '')})`} />
          <path d={strokeD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
};

export default function App() {
  // --- STATE ---
  const [nodes, setNodes] = useState<ServiceNode[]>(INITIAL_NODES);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryFrame[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Chaos States
  const [isTrafficSpike, setIsTrafficSpike] = useState<boolean>(false);
  const [isDbTimeout, setIsDbTimeout] = useState<boolean>(false);

  // Log Filters
  const [logSearch, setLogSearch] = useState<string>('');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');

  // Buffer Refs for Batching High-Frequency Stream Updates
  const telemetryBufferRef = useRef<TelemetryFrame[]>([]);
  const logBufferRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    if (isPaused || !isConnected) return;

    const interval = setInterval(() => {
      const timestamp = Date.now();
      
      // Update nodes state with simulated variations
      setNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.status === 'DOWN') {
            return { ...node, cpu: 0, memory: node.memory, rps: 0, latency: 0, errorRate: 0 };
          }

          let multiplier = 1.0;
          let latencyBoost = 0;
          let errorBoost = 0;

          // Apply Chaos Modifiers
          if (isTrafficSpike) {
            multiplier = 2.8;
            latencyBoost = Math.random() * 80;
          }

          if (isDbTimeout && (node.category === 'DATABASE' || node.category === 'PAYMENT')) {
            latencyBoost += 350;
            errorBoost += 0.35;
          }

          const baseCpuVariation = (Math.random() - 0.5) * 6;
          const newCpu = Math.min(100, Math.max(5, Math.round((node.cpu + baseCpuVariation) * multiplier)));
          const newMemory = Math.min(98, Math.max(10, Math.round(node.memory + (Math.random() - 0.48) * 1.5)));
          const newLatency = Math.max(2, Math.round((node.latency + (Math.random() - 0.5) * 8 + latencyBoost)));
          const newRps = Math.max(0, Math.round((node.rps + (Math.random() - 0.5) * 150) * multiplier));
          
          let newErrorRate = Math.min(100, Math.max(0, +(node.errorRate + (Math.random() - 0.5) * 0.05 + errorBoost).toFixed(2)));

          // Auto-detect High Load / Degraded status dynamically
          let derivedStatus: NodeStatus = node.status;
          if (node.status !== 'DOWN') {
            if (newCpu > 85 || newErrorRate > 0.2 || newLatency > 250) {
              derivedStatus = 'HIGH_LOAD';
            } else if (newCpu > 70 || newErrorRate > 0.08 || newLatency > 120) {
              derivedStatus = 'DEGRADED';
            } else {
              derivedStatus = 'HEALTHY';
            }
          }

          // Random Log Generator Triggering on anomaly
          if (Math.random() > 0.6) {
            let level: LogEntry['level'] = 'INFO';
            let msg = `Handled request cluster payload successfully.`;

            if (derivedStatus === 'HIGH_LOAD' || derivedStatus === 'DEGRADED') {
              level = Math.random() > 0.5 ? 'WARN' : 'ERROR';
              msg = derivedStatus === 'HIGH_LOAD' ? `High CPU/Latency threshold breach detected (${newCpu}% CPU, ${newLatency}ms)` : `Latency degradation observed on cluster thread.`;
            } else if (isDbTimeout && node.category === 'DATABASE') {
              level = 'CRITICAL';
              msg = `Connection pool exhausted! Socket timeout waiting for replica ACK.`;
            }

            const newLog: LogEntry = {
              id: Math.random().toString(36).substring(2, 9),
              timestamp: new Date().toLocaleTimeString(),
              nodeId: node.id,
              nodeName: node.name,
              level,
              message: msg,
              payload: { cpu: newCpu, latencyMs: newLatency, rps: newRps }
            };

            logBufferRef.current.push(newLog);
          }

          return {
            ...node,
            status: derivedStatus,
            cpu: newCpu,
            memory: newMemory,
            latency: newLatency,
            errorRate: newErrorRate,
            rps: newRps
          };
        })
      );

      // Compute Global Aggregate Metrics
      setNodes((currentNodes) => {
        const totalRps = currentNodes.reduce((acc, n) => acc + n.rps, 0);
        const avgLatency = Math.round(currentNodes.reduce((acc, n) => acc + n.latency, 0) / currentNodes.length);
        const totalErrors = currentNodes.reduce((acc, n) => acc + (n.rps * n.errorRate), 0);
        const cpuAverage = Math.round(currentNodes.reduce((acc, n) => acc + n.cpu, 0) / currentNodes.length);

        const frame: TelemetryFrame = {
          timestamp,
          totalRps,
          avgLatency,
          errorCount: Math.round(totalErrors),
          cpuAverage
        };

        telemetryBufferRef.current.push(frame);
        if (telemetryBufferRef.current.length > 30) {
          telemetryBufferRef.current.shift();
        }

        setTelemetryHistory([...telemetryBufferRef.current]);
        return currentNodes;
      });

      // Flush log buffer (batch maximum 40 latest entries for rendering efficiency)
      if (logBufferRef.current.length > 0) {
        setLogs((prev) => [...logBufferRef.current.slice(-30), ...prev].slice(0, 80));
        logBufferRef.current = [];
      }

    }, 800);

    return () => clearInterval(interval);
  }, [isPaused, isConnected, isTrafficSpike, isDbTimeout]);

  // Node Actions
  const handleToggleOutage = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          const nextStatus = n.status === 'DOWN' ? 'HEALTHY' : 'DOWN';
          const newLog: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            nodeId: n.id,
            nodeName: n.name,
            level: nextStatus === 'DOWN' ? 'CRITICAL' : 'INFO',
            message: nextStatus === 'DOWN' ? `MANUAL OUTAGE INJECTED: Service instance killed.` : `SERVICE RECOVERED: Health check passed, traffic restored.`,
          };
          setLogs((l) => [newLog, ...l]);
          return { ...n, status: nextStatus };
        }
        return n;
      })
    );
  };

  const handleInjectLatency = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          const newLog: LogEntry = {
            id: Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            nodeId: n.id,
            nodeName: n.name,
            level: 'WARN',
            message: `CHAOS INJECTION: +300ms artificial latency injected into socket request pipeline.`,
          };
          setLogs((l) => [newLog, ...l]);
          return { ...n, latency: n.latency + 300, status: 'DEGRADED' };
        }
        return n;
      })
    );
  };

  const handleExportTelemetry = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ nodes, telemetryHistory, logs }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PulseEngine-Telemetry-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.message.toLowerCase().includes(logSearch.toLowerCase()) || log.nodeName.toLowerCase().includes(logSearch.toLowerCase());
      const matchesLevel = logLevelFilter === 'ALL' || log.level === logLevelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [logs, logSearch, logLevelFilter]);

  // Selected Node Details
  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId]);

  const renderStatusBadge = (status: NodeStatus) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            HEALTHY
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            DEGRADED
          </span>
        );
      case 'HIGH_LOAD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            HIGH LOAD
          </span>
        );
      case 'DOWN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/60 text-red-400 border border-red-800/40">
            <XCircle className="w-3 h-3 text-red-500" />
            OUTAGE
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200 antialiased p-4 md:p-6">
      <div className="max-w-[1680px] mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-500/30 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Zap className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white font-mono">PULSE<span className="text-amber-400">ENGINE</span></h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-slate-800 text-amber-400 border border-slate-700/60">
                  Enterprise v4.8
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">High-Frequency Microservice Observability & Telemetry Mesh</p>
            </div>
          </div>

          {/* Connection Status & Stream Controls */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs font-mono">
              <Radio className={`w-3.5 h-3.5 ${isConnected && !isPaused ? 'text-emerald-400 animate-pulse' : 'text-amber-500'}`} />
              <span className="text-slate-400">WS STREAM:</span>
              <span className={`font-bold ${isConnected && !isPaused ? 'text-emerald-400' : 'text-amber-400'}`}>
                {!isConnected ? 'DISCONNECTED' : isPaused ? 'PAUSED' : 'LIVE 800ms'}
              </span>
            </div>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                isPaused
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-slate-800/80 text-slate-200 border-slate-700/80 hover:bg-slate-700'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              {isPaused ? 'Resume Stream' : 'Pause Stream'}
            </button>

            <button
              onClick={() => setIsConnected(!isConnected)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${!isConnected ? 'animate-spin' : ''}`} />
              {isConnected ? 'Reconnect Socket' : 'Connect Socket'}
            </button>

            <button
              onClick={handleExportTelemetry}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all shadow-lg shadow-amber-500/5"
            >
              <Download className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
        </header>

        {/* --- REALTIME METRICS OVERVIEW & SPARK LINES --- */}
        {}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RealtimeAreaChart
            data={telemetryHistory.map((f) => f.totalRps)}
            maxVal={18000}
            color="#38bdf8"
            label="Cluster Throughput"
            unit="RPS"
          />
          <RealtimeAreaChart
            data={telemetryHistory.map((f) => f.avgLatency)}
            maxVal={300}
            color="#f59e0b"
            label="Avg Latency"
            unit="ms"
          />
          <RealtimeAreaChart
            data={telemetryHistory.map((f) => f.cpuAverage)}
            maxVal={100}
            color="#10b981"
            label="Fleet CPU Avg"
            unit="%"
          />
          <RealtimeAreaChart
            data={telemetryHistory.map((f) => f.errorCount)}
            maxVal={50}
            color="#f43f5e"
            label="Failed Requests"
            unit="err/s"
          />
        </div>

        {/* --- CHAOS & SIMULATION CONTROL PANEL --- */}
        {}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-900/80 border border-slate-800/80 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Chaos & Stress Testing Engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsTrafficSpike(!isTrafficSpike)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isTrafficSpike
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.25)] animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              {isTrafficSpike ? 'STOP TRAFFIC SPIKE' : 'SPIKE TRAFFIC (+10k RPS)'}
            </button>

            <button
              onClick={() => setIsDbTimeout(!isDbTimeout)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isDbTimeout
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              {isDbTimeout ? 'RESOLVE DB TIMEOUT' : 'INJECT DB TIMEOUT'}
            </button>

            <button
              onClick={() => {
                setNodes(INITIAL_NODES);
                setIsTrafficSpike(false);
                setIsDbTimeout(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all"
            >
              Reset Fleet
            </button>
          </div>
        </div>

        {/* --- SERVICE FLEET GRID --- */}
        {}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Microservice Fleet Active Nodes</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{nodes.filter(n => n.status !== 'DOWN').length} / {nodes.length} Operational</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`group relative rounded-2xl p-5 transition-all duration-300 cursor-pointer border backdrop-blur-xl ${
                    node.status === 'DOWN'
                      ? 'bg-red-950/10 border-red-900/30 hover:border-red-600/50'
                      : isSelected
                      ? 'bg-slate-900/90 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/30'
                      : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-amber-400 group-hover:scale-105 transition-transform">
                        {node.category === 'GATEWAY' && <Globe className="w-5 h-5" />}
                        {node.category === 'AUTH' && <Lock className="w-5 h-5" />}
                        {node.category === 'PAYMENT' && <Zap className="w-5 h-5" />}
                        {node.category === 'WORKER' && <Cpu className="w-5 h-5" />}
                        {node.category === 'DATABASE' && <Database className="w-5 h-5" />}
                        {node.category === 'CACHE' && <HardDrive className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm group-hover:text-amber-300 transition-colors">{node.name}</h3>
                        <p className="text-[11px] font-mono text-slate-500">{node.version} • {node.instances} replicas</p>
                      </div>
                    </div>
                    {renderStatusBadge(node.status)}
                  </div>

                  {/* Node Realtime Gauges */}
                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>CPU Load</span>
                        <span className={node.cpu > 80 ? 'text-rose-400 font-bold' : 'text-slate-200'}>{node.cpu}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            node.cpu > 80 ? 'bg-rose-500' : node.cpu > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${node.cpu}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Memory</span>
                        <span>{node.memory}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full transition-all duration-500" style={{ width: `${node.memory}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Metrics Stats Line */}
                  <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-slate-800/60 text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Latency</span>
                      <span className={`font-semibold ${node.latency > 200 ? 'text-rose-400' : 'text-slate-200'}`}>{node.latency} ms</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Throughput</span>
                      <span className="font-semibold text-slate-200">{node.rps.toLocaleString()} RPS</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Error Rate</span>
                      <span className={`font-semibold ${node.errorRate > 0.1 ? 'text-rose-400' : 'text-emerald-400'}`}>{node.errorRate}%</span>
                    </div>
                  </div>

                  {/* Quick Action Overlay Controls on Hover */}
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between gap-2 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleOutage(node.id);
                      }}
                      className={`flex-1 py-1 px-2 rounded text-[11px] font-semibold transition-all border ${
                        node.status === 'DOWN'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                      }`}
                    >
                      {node.status === 'DOWN' ? 'Recover' : 'Kill Node'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInjectLatency(node.id);
                      }}
                      disabled={node.status === 'DOWN'}
                      className="flex-1 py-1 px-2 rounded text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700/80 transition-all disabled:opacity-40"
                    >
                      +300ms Lag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- LIVE AUDIT LOG TAILER CONSOLE --- */}
        {}
        <div className="rounded-2xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden flex flex-col h-[380px]">
          {/* Console Toolbar */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Live Telemetry & Audit Stream Log Tailer</span>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                {filteredLogs.length} events buffered
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs or payload..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg pl-8 pr-3 py-1 focus:outline-none focus:border-amber-500/50 w-44"
                />
              </div>

              {/* Severity Dropdown */}
              <select
                value={logLevelFilter}
                onChange={(e) => setLogLevelFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500/50"
              >
                <option value="ALL">ALL SEVERITIES</option>
                <option value="INFO">INFO ONLY</option>
                <option value="WARN">WARNINGS</option>
                <option value="ERROR">ERRORS</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>

              <button
                onClick={() => setLogs([])}
                className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/60"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Console Stream Output */}
          <div className="p-4 overflow-y-auto flex-1 font-mono text-xs space-y-2 selection:bg-slate-800">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 italic">
                No telemetry log entries matching current filter criteria.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 hover:bg-slate-900/50 p-1.5 rounded transition-colors group">
                  <span className="text-slate-500 select-none shrink-0">{log.timestamp}</span>
                  
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 border ${
                      log.level === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : log.level === 'ERROR'
                        ? 'bg-red-900/30 text-red-400 border-red-800/40'
                        : log.level === 'WARN'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {log.level}
                  </span>

                  <span className="text-amber-400 font-semibold shrink-0">[{log.nodeName}]</span>

                  <span className="text-slate-300 break-all">{log.message}</span>

                  {log.payload && (
                    <span className="text-slate-500 text-[11px] hidden lg:inline-block ml-auto shrink-0 font-mono">
                      {JSON.stringify(log.payload)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- NODE DETAIL INSPECTOR DRAWER / MODAL --- */}
        {}
        {selectedNode && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-slate-950 border-l border-slate-800 h-full p-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
              <div>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-amber-400">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{selectedNode.name}</h2>
                      <p className="text-xs font-mono text-slate-500">ID: {selectedNode.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Node Status & Metrics */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="text-sm font-medium text-slate-300">Operational Health</span>
                    {renderStatusBadge(selectedNode.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono">
                    <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">CPU Core Utilization</span>
                      <span className="text-lg font-bold text-slate-100">{selectedNode.cpu}%</span>
                    </div>
                    <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Memory RSS</span>
                      <span className="text-lg font-bold text-slate-100">{selectedNode.memory}%</span>
                    </div>
                    <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Roundtrip Latency</span>
                      <span className="text-lg font-bold text-amber-400">{selectedNode.latency} ms</span>
                    </div>
                    <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-500 block">Request Throughput</span>
                      <span className="text-lg font-bold text-cyan-400">{selectedNode.rps} RPS</span>
                    </div>
                  </div>

                  {/* System Metadata */}
                  <div className="space-y-2 border-t border-slate-800/80 pt-4 text-xs font-mono">
                    <div className="flex justify-between py-1 text-slate-400">
                      <span>Uptime Seconds</span>
                      <span className="text-slate-200">{selectedNode.uptime.toLocaleString()}s</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-400">
                      <span>Active Replicas</span>
                      <span className="text-slate-200">{selectedNode.instances} instances</span>
                    </div>
                    <div className="flex justify-between py-1 text-slate-400">
                      <span>Engine Version</span>
                      <span className="text-slate-200">{selectedNode.version}</span>
                    </div>
                  </div>

                  {/* Dedicated Logs for this node */}
                  <div className="border-t border-slate-800/80 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Isolated Node Log Output</h4>
                    <div className="bg-slate-900 p-3 rounded-xl border border-slate-800/80 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
                      {logs.filter(l => l.nodeId === selectedNode.id).length === 0 ? (
                        <p className="text-slate-600 italic">No specific logs captured for this node yet.</p>
                      ) : (
                        logs.filter(l => l.nodeId === selectedNode.id).map(log => (
                          <div key={log.id} className="text-slate-300 border-b border-slate-800/40 pb-1">
                            <span className="text-amber-400 mr-2">[{log.timestamp}]</span>
                            {log.message}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Controls */}
              <div className="pt-6 border-t border-slate-800 flex gap-3">
                <button
                  onClick={() => handleToggleOutage(selectedNode.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedNode.status === 'DOWN'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {selectedNode.status === 'DOWN' ? 'Bring Node Online' : 'Kill Service Node'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}