# Lean CNC Digital Twin Platform

Plataforma web para monitoramento, simulação (Digital Twin) e otimização de processos de usinagem CNC baseada em **Lean Manufacturing 4.0**, com integração Modbus TCP/IP para CLP Delta DVP-SE.

---

## 🛠️ Pré-requisitos

Certifique-se de ter instalado em sua máquina:
* **[Node.js](https://nodejs.org/)** (Versão LTS) - Necessário para o Frontend (React/Vite).
* **[Python 3.10+](https://www.python.org/)** - Necessário para backend de comunicação CLP, MQTT e simulação.
* **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** *(Opcional)* - Para rodar Broker MQTT e Banco de Dados.

---

## 🚀 Passo a Passo de Instalação e Execução

### 1. Configurar o Frontend (React + Vite)

Abra o terminal no VS Code na raiz da sua pasta e execute um comando por vez:

```bash
# 1. Criar o projeto React (JavaScript)
npm create vite@latest lean-cnc-frontend -- --template react

# 2. Acessar a pasta do projeto
cd lean-cnc-frontend

# 3. Instalar dependências base
npm install

# 4. Instalar ícones, gráficos e estilização (Tailwind CSS)
npm install lucide-react recharts clsx
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Configurar o Tailwind CSS
1. No arquivo `tailwind.config.js`, substitua o campo `content`:
   ```javascript
   content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
   ```
2. No arquivo `src/index.css`, adicione no início:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
3. Cole o código da aplicação no arquivo `src/App.jsx`.

#### Iniciar o Frontend
```bash
npm run dev
```
Acesse o sistema pelo navegador no endereço exibido no terminal (ex: `http://localhost:5173`).

---

### 2. Configurar o Ambiente Python (CLP & Simulação)

Em outro terminal no VS Code, instale as bibliotecas para comunicação Modbus, MQTT e simulação:

```bash
pip install pymodbus paho-mqtt simpy pandas streamlit
```

---

### 3. Infraestrutura IoT (MQTT & Banco de Dados)

Para subir o **Mosquitto (MQTT)** e o **InfluxDB** via Docker, crie um arquivo `docker-compose.yml` na raiz do projeto:

```yaml
version: '3.8'
services:
  mosquitto:
    image: eclipse-mosquitto:latest
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto/config:/mosquitto/config

  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    environment:
      - DOCKER_INFLUXDB_INIT_MODE=setup
      - DOCKER_INFLUXDB_INIT_USERNAME=admin
      - DOCKER_INFLUXDB_INIT_PASSWORD=adminpassword123
      - DOCKER_INFLUXDB_INIT_ORG=lean_cnc
      - DOCKER_INFLUXDB_INIT_BUCKET=cnc_iot_data
```

Crie o arquivo `mosquitto/config/mosquitto.conf` com:
```text
listener 1883
allow_anonymous true
```

Inicie os containers:
```bash
docker-compose up -d
```

---

## 🔌 Mapeamento CLP Delta DVP-SE (Modbus TCP/IP)

| Endereço | Tipo | Descrição |
| :--- | :--- | :--- |
| **M0** | Coil (Bit) | Botão de Emergência (Emergency Button) |
| **M1** | Coil (Bit) | Condição de Segurança (Safety Condition) |
| **M2** | Coil (Bit) | Botão Iniciar (Start Button) |
| **M3** | Coil (Bit) | Botão Parar (Stop Button) |
| **M4** | Coil (Bit) | Botão Reset (Reset Button) |
| **M5** | Coil (Bit) | Ferramenta Conectada (Tools PlugIn) |
| **D0** | Register | Status da Máquina (`0`=Stop, `1`=Run, `2`=Setup, `3`=Fault) |
| **D1** | Register | Código de Falha (`0`=OK, `>0`=Código de Erro) |
| **D2** | Register | Contador de Produção (Peças) |

---

## 📋 Funcionalidades Principais

* **Dashboard:** KPIs Lean em tempo real (OEE, Setup, Lead Time, WIP, Ciclo, Utilização) e status das 8 máquinas CNC.
* **Digital Twin:** Fluxo produtivo e simulador *What-If* com comparativo automático de cenários.
* **e-Kanban:** Gestão de ordens (Normal/Urgente) e cálculo automático de lote nivelado via *Heijunka*.
* **IoT & CLP:** Painel de acionamento remoto de coils (`M0-M5`), leitura de registradores (`D0-D2`) e telemetria MQTT.
* **Relatórios:** Histórico de eventos e exportação de dados (PDF, Excel, CSV).