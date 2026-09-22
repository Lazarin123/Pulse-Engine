export type NodeStatus = 'healthy' | 'degraded' | 'critical' | 'offline';

export interface MicroserviceNode {
  id: string;
  name: string;
  region: string;
  cpu: number;
  memory: number;
  latency: number;
  rpm: number;
  errors: number;
  status: NodeStatus;
}

export interface SystemMetrics {
  timestamp: string;
  totalRpm: number;
  avgLatency: number;
  errorRate: number;
  activeNodes: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  traceId: string;
}

export interface ChaosState {
  spikeTest: boolean;
  offlineNodes: string[];
}
