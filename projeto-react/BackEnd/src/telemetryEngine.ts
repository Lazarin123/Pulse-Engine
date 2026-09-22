import { MicroserviceNode, SystemMetrics, LogEntry, ChaosState, NodeStatus } from './types.js';

export class TelemetryEngine {
  private nodes: MicroserviceNode[] = [
    { id: 'auth-service', name: 'Auth & Identity API', region: 'us-east-1', cpu: 28, memory: 42, latency: 24, rpm: 1240, errors: 0.1, status: 'healthy' },
    { id: 'payment-service', name: 'Payment Gateway Engine', region: 'us-east-1', cpu: 45, memory: 68, latency: 85, rpm: 2100, errors: 0.3, status: 'healthy' },
    { id: 'orders-service', name: 'Order Processing Pipeline', region: 'sa-east-1', cpu: 32, memory: 55, latency: 42, rpm: 1850, errors: 0.2, status: 'healthy' },
    { id: 'analytics-service', name: 'Realtime Analytics Engine', region: 'eu-central-1', cpu: 78, memory: 84, latency: 130, rpm: 3400, errors: 1.2, status: 'degraded' }
  ];

  private chaosState: ChaosState = {
    spikeTest: false,
    offlineNodes: []
  };

  public getNodes(): MicroserviceNode[] {
    return this.nodes;
  }

  public toggleOffline(nodeId: string): void {
    const idx = this.chaosState.offlineNodes.indexOf(nodeId);
    if (idx > -1) {
      this.chaosState.offlineNodes.splice(idx, 1);
    } else {
      this.chaosState.offlineNodes.push(nodeId);
    }
  }

  public setSpikeTest(active: boolean): void {
    this.chaosState.spikeTest = active;
  }

  public getChaosState(): ChaosState {
    return this.chaosState;
  }

  public tick(): { nodes: MicroserviceNode[]; metrics: SystemMetrics; log: LogEntry } {
    const isSpike = this.chaosState.spikeTest;

    this.nodes = this.nodes.map(node => {
      const isOffline = this.chaosState.offlineNodes.includes(node.id);

      if (isOffline) {
        return {
          ...node,
          cpu: 0,
          memory: 0,
          latency: 0,
          rpm: 0,
          errors: 100,
          status: 'offline'
        };
      }

      const cpuFluctuation = (Math.random() - 0.5) * 8;
      const memFluctuation = (Math.random() - 0.5) * 4;
      const spikeMultiplier = isSpike ? 2.2 : 1.0;

      let cpu = Math.min(100, Math.max(10, node.cpu + cpuFluctuation * spikeMultiplier));
      let memory = Math.min(100, Math.max(20, node.memory + memFluctuation));
      let rpm = Math.floor((1000 + Math.random() * 2000) * spikeMultiplier);
      let latency = Math.floor((20 + Math.random() * 40) * (isSpike ? 3.5 : 1.0));
      let errors = Number((Math.random() * (isSpike ? 4.5 : 0.8)).toFixed(2));

      let status: NodeStatus = 'healthy';
      if (cpu > 85 || latency > 180 || errors > 3.0) {
        status = 'critical';
      } else if (cpu > 70 || latency > 100 || errors > 1.5) {
        status = 'degraded';
      }

      return { ...node, cpu: Math.round(cpu), memory: Math.round(memory), latency, rpm, errors, status };
    });

    const activeNodesList = this.nodes.filter(n => n.status !== 'offline');
    const totalRpm = activeNodesList.reduce((acc, n) => acc + n.rpm, 0);
    const avgLatency = activeNodesList.length > 0 
      ? Math.round(activeNodesList.reduce((acc, n) => acc + n.latency, 0) / activeNodesList.length) 
      : 0;
    const avgErrorRate = activeNodesList.length > 0
      ? Number((activeNodesList.reduce((acc, n) => acc + n.errors, 0) / activeNodesList.length).toFixed(2))
      : 100;

    const metrics: SystemMetrics = {
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      totalRpm,
      avgLatency,
      errorRate: avgErrorRate,
      activeNodes: activeNodesList.length
    };

    const randomNode = this.nodes[Math.floor(Math.random() * this.nodes.length)];
    const logLevels: ('INFO' | 'WARN' | 'ERROR')[] = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
    const level = isSpike ? (Math.random() > 0.4 ? 'WARN' : 'ERROR') : logLevels[Math.floor(Math.random() * logLevels.length)];

    const logMessages = {
      INFO: ['HTTP GET /health 200 OK', 'Cache hit on user session payload', 'Database connection pool active'],
      WARN: ['High latency detected on upstream service', 'Memory usage threshold > 75%', 'Rate-limiting policy triggered'],
      ERROR: ['Connection timeout to Postgres primary', 'Unhandled rejection: Redis connection lost', 'Circuit breaker OPEN']
    };

    const log: LogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      service: randomNode.name,
      level,
      message: logMessages[level][Math.floor(Math.random() * logMessages[level].length)],
      traceId: `trace-${Math.random().toString(36).substring(2, 8)}`
    };

    return { nodes: this.nodes, metrics, log };
  }
}
