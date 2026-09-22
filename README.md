<div align="center">

  <br />

  <!-- Title & Subtitle -->
  <h1 align="center">
    <span style="color: #D4AF37;">PULSE</span>ENGINE
  </h1>

  <p align="center">
    <b>Plataforma de Observabilidade & Telemetria de Microserviços em Tempo Real</b>
  </p>

  <p align="center">
    Uma solução de monitoramento de alta performance projetada para processar fluxos contínuos de métricas, simular cenários de estresse via <i>Chaos Engineering</i> e fornecer visualizações em tempo real com comunicação bidirecional de baixa latência.
  </p>

  <!-- Badges -->
  <p align="center">
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/WebSockets-WS-D4AF37?style=for-the-badge&logo=websocket&logoColor=black" alt="WebSockets" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Vercel-Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/Render-Backend-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
  </p>

  <br />

</div>

---

## 📌 Visão Geral

O **PulseEngine** resolve o desafio de agregação e exibição de dados de telemetria em ambientes distribuídos e microserviços. A aplicação permite monitorar a saúde de nós em tempo real, analisando consumo de recursos (CPU, Memória), vazão de requisições por minuto (RPM), latência e taxa de erros.

Com uma **Arquitetura Orientada a Eventos (_Event-Driven Architecture_)**, o sistema estabelece uma conexão persistente e segura via **WebSockets**, garantindo atualizações instantâneas sem a necessidade de _polling_ HTTP constante.

---

## ✨ Principais Funcionalidades

- ⚡ **Telemetria via WebSockets (`wss://`):** Atualização de métricas globais e logs de auditoria transmitidos a cada segundo.
- 🎛️ **Engine de Chaos Engineering:**
  - **Spike Tests:** Simulação instantânea de picos de tráfego de até +300% de carga no cluster.
  - **Node Outages:** Capacidade de desativar ou reativar nós específicos para testar a resiliência da infraestrutura.
- 📊 **Visualização Dinâmica de Métricas:** Gráficos interativos com acompanhamento de vazão de requisições e status por nós/serviços.
- 📜 **Audit Log Stream:** Console de logs estruturados em tempo real com níveis de severidade (`INFO`, `WARN`, `ERROR`) e rastreabilidade por `traceId`.
- 🎨 **Design System Luxury Tech:** Interface escura (_Dark Mode_) profissional com acentos em dourado e ciano, focada em UX para consoles de engenharia.

---

## 📐 Arquitetura de Implantação

```text
  ┌────────────────────────┐    WebSocket (wss://)     ┌────────────────────────┐
  │     Vercel Client      │ ◄───────────────────────► │     Render Backend     │
  │ (React 18 + Vite SPA)  │    REST API (https://)    │ (Node.js + ws Server)  │
  └────────────────────────┘                           └───────────┬────────────┘
                                                                   │
                                                                   ├── Telemetry Engine
                                                                   ├── Chaos Generator
                                                                   └── WS Broadcast Loop
```

---

## 🛠️ Tecnologias Utilizadas

### **Frontend**

- **React 18** + **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Recharts**
- **Lucide React**

### **Backend**

- **Node.js** + **TypeScript**
- **Express** (API REST para ações de controle)
- **ws** (Servidor WebSocket nativo para transmissão continua)

---

## 🌐 Ambientes de Produção

- **Backend (Render):** `https://pulse-engine-1lf6.onrender.com`
- **WebSocket Endpoint:** `wss://pulse-engine-1lf6.onrender.com`
- **Frontend (Vercel):** _Deploy configurado via repositório GitHub_

---

## 🚀 Como Executar Localmente

### Pré-requisitos

- **Node.js** (v18.x ou superior)
- **npm** ou **yarn**

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/pulse-engine.git
cd pulse-engine
```

### 2. Executar o Backend

```bash
cd projeto-react/BackEnd
npm install
npm run dev
```

O servidor estará ativo em `http://localhost:4000` e o WebSocket em `ws://localhost:4000`.

### 3. Executar o Frontend

Em uma nova janela do terminal:

```bash
cd projeto-react/FrontEnd
npm install
npm run dev
```

Acesse a aplicação no seu navegador na URL exibida (geralmente `http://localhost:5173`).

---

## ⚙️ Variáveis de Ambiente (Frontend)

Para conectar o Frontend ao Backend em diferentes ambientes, utilize as variáveis abaixo no arquivo `.env` ou no painel da Vercel:

| Variável       | Descrição                 | Exemplo de Valor                         |
| :------------- | :------------------------ | :--------------------------------------- |
| `VITE_API_URL` | URL do servidor HTTP/REST | `https://pulse-engine-1lf6.onrender.com` |
| `VITE_WS_URL`  | URL do servidor WebSocket | `wss://pulse-engine-1lf6.onrender.com`   |

---

<div align="center">

  <br />

  <p>Desenvolvido com foco em alta performance, resiliência e arquitetura limpa.</p>

</div>
