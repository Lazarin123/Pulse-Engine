import express from 'express';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { TelemetryEngine } from './telemetryEngine';

const PORT = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const engine = new TelemetryEngine();

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', timestamp: new Date().toISOString() });
});

app.post('/api/chaos/toggle-node', (req, res) => {
  const { nodeId } = req.body;
  if (!nodeId) return res.status(400).json({ error: 'nodeId é obrigatório' });
  
  engine.toggleOffline(nodeId);
  return res.json({ success: true, chaosState: engine.getChaosState() });
});

app.post('/api/chaos/spike-test', (req, res) => {
  const { active } = req.body;
  engine.setSpikeTest(Boolean(active));
  return res.json({ success: true, chaosState: engine.getChaosState() });
});

// Broadcast WebSockets
wss.on('connection', (ws: WebSocket) => {
  console.log('⚡ Client conectou ao WebSocket PulseEngine');
  
  ws.send(JSON.stringify({ type: 'INIT_STATE', chaosState: engine.getChaosState() }));

  ws.on('close', () => {
    console.log('❌ Client desconectou');
  });
});

setInterval(() => {
  const telemetryData = engine.tick();
  const payload = JSON.stringify({
    type: 'TELEMETRY_UPDATE',
    data: telemetryData,
    chaosState: engine.getChaosState()
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}, 1000);

server.listen(PORT, () => {
  console.log(`🚀 PulseEngine Backend rodando na porta http://localhost:${PORT}`);
  console.log(`📡 WebSocket server ativo em ws://localhost:${PORT}`);
});
