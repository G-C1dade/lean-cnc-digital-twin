
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Cpu, 
  LayoutDashboard, 
  Kanban, 
  FileText, 
  Wifi, 
  AlertTriangle, 
  Play, 
  Square, 
  RotateCcw, 
  ShieldCheck, 
  ShieldAlert, 
  Wrench, 
  TrendingUp, 
  Clock, 
  Box, 
  Layers, 
  Settings, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  RefreshCw, 
  Zap, 
  Sliders, 
  ArrowRight, 
  BarChart3, 
  Server, 
  Gauge, 
  Radio
} from 'lucide-react';

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Real-time ticker for RNF-4.9 (Interval < 5s)
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTicker(t => t + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // --- STATE: CNC MACHINES (8 Machines as per RF-3.1.5) ---
  const [machines, setMachines] = useState([
    { id: 1, name: 'CNC-01 (Torno)', status: 'RUNNING', oee: 88, cycleTime: 42, setupTime: 8, wip: 12, fault: 'Nenhum' },
    { id: 2, name: 'CNC-02 (Torno)', status: 'RUNNING', oee: 84, cycleTime: 45, setupTime: 9, wip: 14, fault: 'Nenhum' },
    { id: 3, name: 'CNC-03 (Centro 3E)', status: 'SETUP', oee: 62, cycleTime: 0, setupTime: 14, wip: 8, fault: 'Aguardando Ferramenta' }, // Setup alert
    { id: 4, name: 'CNC-04 (Centro 3E)', status: 'RUNNING', oee: 91, cycleTime: 38, setupTime: 7, wip: 10, fault: 'Nenhum' },
    { id: 5, name: 'CNC-05 (Centro 5E)', status: 'STOPPED', oee: 45, cycleTime: 0, setupTime: 0, wip: 22, fault: 'Aquecimento Spindle' }, // Low OEE + Stop
    { id: 6, name: 'CNC-06 (Centro 5E)', status: 'RUNNING', oee: 86, cycleTime: 50, setupTime: 8, wip: 15, fault: 'Nenhum' },
    { id: 7, name: 'CNC-07 (Retífica)', status: 'RUNNING', oee: 79, cycleTime: 60, setupTime: 10, wip: 18, fault: 'Nenhum' },
    { id: 8, name: 'CNC-08 (Retífica)', status: 'IDLE', oee: 72, cycleTime: 0, setupTime: 5, wip: 5, fault: 'Sem Material' }
  ]);

  // Dynamic simulation update every ticker
  useEffect(() => {
    setMachines(prev => prev.map(m => {
      if (m.status === 'RUNNING') {
        const oeeVariation = (Math.random() * 4 - 2);
        return {
          ...m,
          oee: Math.min(99, Math.max(40, Math.round(m.oee + oeeVariation))),
          wip: Math.max(2, Math.min(30, m.wip + Math.floor(Math.random() * 3 - 1)))
        };
      }
      return m;
    }));
  }, [ticker]);

  // --- STATE: CLP DELTA DVP-SE INTEGRATION ---
  const [clpMemory, setClpMemory] = useState({
    M0: false, // Emergency Stop
    M1: true,  // Safety Condition
    M2: false, // Start
    M3: false, // Stop
    M4: false, // Reset
    M5: true   // Tools PlugIn
  });

  const [clpRegisters, setClpRegisters] = useState({
    D0: 1,  // Status Machine: 0=Stop, 1=Running, 2=Setup, 3=Fault
    D1: 0,  // Fault Status: 0=OK, 101=Overheat, 102=Safety Tripped, 103=E-Stop Active
    D2: 1450 // Production Counter
  });

  // CLP Logic Simulation
  const handleClpCoilToggle = (coil) => {
    setClpMemory(prev => {
      const next = { ...prev, [coil]: !prev[coil] };
      
      // Logic responses based on PLC input
      if (coil === 'M0') { // Emergency
        if (!prev.M0) {
          setClpRegisters(r => ({ ...r, D0: 3, D1: 103 }));
        } else {
          setClpRegisters(r => ({ ...r, D0: 0, D1: 0 }));
        }
      } else if (coil === 'M2' && !next.M0 && next.M1) { // Start
        setClpRegisters(r => ({ ...r, D0: 1, D1: 0 }));
      } else if (coil === 'M3') { // Stop
        setClpRegisters(r => ({ ...r, D0: 0 }));
      } else if (coil === 'M4') { // Reset
        setClpRegisters(r => ({ ...r, D1: 0, D0: next.M1 ? 0 : 3 }));
      }
      return next;
    });
  };

  // Increment CLP Production when machine is running
  useEffect(() => {
    if (clpRegisters.D0 === 1 && !clpMemory.M0 && clpMemory.M1) {
      setClpRegisters(r => ({ ...r, D2: r.D2 + Math.floor(Math.random() * 3 + 1) }));
    }
  }, [ticker]);

  // --- GLOBAL METRICS (RN & RF CALCULATIONS) ---
  const globalMetrics = useMemo(() => {
    const totalOee = Math.round(machines.reduce((acc, m) => acc + m.oee, 0) / machines.length);
    const avgSetup = (machines.reduce((acc, m) => acc + m.setupTime, 0) / machines.length).toFixed(1);
    const totalWip = machines.reduce((acc, m) => acc + m.wip, 0);
    const runningCount = machines.filter(m => m.status === 'RUNNING').length;
    const utilizationRate = Math.round((runningCount / machines.length) * 100);
    const avgCycle = Math.round(machines.reduce((acc, m) => acc + (m.cycleTime || 40), 0) / machines.length);

    return {
      oee: totalOee,
      setupTime: parseFloat(avgSetup),
      leadTimeDays: 2.4, // RN-5.3 Goal <= 3 days
      wip: totalWip,
      cycleTime: avgCycle,
      utilization: utilizationRate,
      runningCount
    };
  }, [machines]);

  // --- SYSTEM ALERTS GENERATOR (RN-5.6) ---
  const alerts = useMemo(() => {
    const list = [];
    if (globalMetrics.setupTime > 10) {
      list.push({ type: 'warning', code: 'SETUP_HIGH', msg: `Tempo de Setup médio (${globalMetrics.setupTime} min) acima da meta de 10 min!` });
    }
    if (globalMetrics.oee < 75) {
      list.push({ type: 'danger', code: 'OEE_LOW', msg: `OEE Geral (${globalMetrics.oee}%) abaixo da meta operacional de 75%.` });
    }
    if (globalMetrics.wip > 100) {
      list.push({ type: 'warning', code: 'WIP_EXCESS', msg: `WIP acumulado (${globalMetrics.wip} un) excedendo limite do chão de fábrica.` });
    }
    if (clpMemory.M0) {
      list.push({ type: 'danger', code: 'CLP_EMERGENCY', msg: `CLP Delta DVP-SE: Botão de Emergência M0 Ativado!` });
    }
    if (!clpMemory.M1) {
      list.push({ type: 'danger', code: 'CLP_SAFETY', msg: `CLP Delta DVP-SE: Condição de Segurança M1 Inviolada/Inativa.` });
    }
    machines.filter(m => m.status === 'STOPPED').forEach(m => {
      list.push({ type: 'danger', code: 'MACHINE_STOP', msg: `${m.name} Parada: ${m.fault}` });
    });
    return list;
  }, [globalMetrics, clpMemory, machines]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-20">
        <div>
          {/* Logo / Brand */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-wide leading-tight">Lean CNC</h1>
              <p className="text-xs text-cyan-400 font-medium">Digital Twin Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard Screen', icon: LayoutDashboard },
              { id: 'digital-twin', label: 'Digital Twin', icon: Layers },
              { id: 'kanban', label: 'e-Kanban', icon: Kanban },
              { id: 'iot-clp', label: 'IoT & CLP Delta', icon: Radio },
              { id: 'reports', label: 'Relatórios', icon: FileText },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10' 
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Status Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-400">Status Modbus/MQTT</span>
            <span className="flex items-center text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
              Conectado
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            CLP Delta DVP-SE IP: 192.168.1.50
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100">
        
        {/* TOP HEADER */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-white capitalize">
              {activeTab.replace('-', ' ')}
            </h2>
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full flex items-center">
              <RefreshCw className="w-3 h-3 mr-1.5 animate-spin text-cyan-400" />
              Atualizado em tempo real ({ticker * 3}s)
            </span>
          </div>

          {/* Quick Alert Counter */}
          <div className="flex items-center space-x-4">
            {alerts.length > 0 && (
              <div className="flex items-center space-x-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-amber-400 text-xs">
                <AlertTriangle className="w-4 h-4 animate-bounce" />
                <span>{alerts.length} Alerta(s) do Sistema</span>
              </div>
            )}
            <div className="text-xs text-slate-400 text-right">
              <div>Lean Industry 4.0</div>
              <div className="text-[10px] text-slate-500">DVP-SE Modbus TCP</div>
            </div>
          </div>
        </header>

        {/* ALERTS BANNER (IF ANY) */}
        {alerts.length > 0 && (
          <div className="bg-slate-900 border-b border-amber-500/20 px-6 py-2.5 flex flex-wrap gap-3 items-center text-xs">
            <span className="font-semibold text-amber-400 flex items-center">
              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Notificações Ativas:
            </span>
            {alerts.map((a, idx) => (
              <span key={idx} className={`px-2.5 py-1 rounded border ${
                a.type === 'danger' 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                {a.msg}
              </span>
            ))}
          </div>
        )}

        {/* SCREEN ROUTING CONTENT */}
        <div className="p-6 space-y-6 flex-1">
          {activeTab === 'dashboard' && (
            <DashboardScreen machines={machines} metrics={globalMetrics} alerts={alerts} />
          )}

          {activeTab === 'digital-twin' && (
            <DigitalTwinScreen machines={machines} currentMetrics={globalMetrics} />
          )}

          {activeTab === 'kanban' && (
            <KanbanScreen />
          )}

          {activeTab === 'iot-clp' && (
            <IoTClpScreen 
              machines={machines} 
              clpMemory={clpMemory} 
              clpRegisters={clpRegisters} 
              onCoilToggle={handleClpCoilToggle} 
            />
          )}

          {activeTab === 'reports' && (
            <ReportsScreen machines={machines} metrics={globalMetrics} />
          )}
        </div>
      </main>
    </div>
  );
}

// ==========================================
// 1. DASHBOARD SCREEN
// ==========================================
function DashboardScreen({ machines, metrics, alerts }) {
  const [historyPeriod, setHistoryPeriod] = useState('HOJE');

  return (
    <div className="space-y-6">
      
      {/* REAL-TIME KPI CARDS (RF-3.1.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Setup Time */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Tempo de Setup</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.setupTime} <span className="text-sm font-normal text-slate-400">min</span></div>
            <div className="text-xs mt-1 text-emerald-400 flex items-center">
              Meta: &lt; 10 min (RN-5.2)
            </div>
          </div>
        </div>

        {/* Lead Time */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Lead Time</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.leadTimeDays} <span className="text-sm font-normal text-slate-400">dias</span></div>
            <div className="text-xs mt-1 text-emerald-400">
              Meta: &le; 3 dias (RN-5.3)
            </div>
          </div>
        </div>

        {/* OEE */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">OEE Geral</span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.oee}%</div>
            <div className="text-xs mt-1 text-slate-400">
              Disp x Desemp x Qual (RN-5.1)
            </div>
          </div>
        </div>

        {/* WIP */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">WIP Total</span>
            <Box className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.wip} <span className="text-sm font-normal text-slate-400">pçs</span></div>
            <div className="text-xs mt-1 text-amber-400">
              Estoque Intermediário
            </div>
          </div>
        </div>

        {/* Cycle Time */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Tempo de Ciclo</span>
            <Zap className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.cycleTime} <span className="text-sm font-normal text-slate-400">s</span></div>
            <div className="text-xs mt-1 text-slate-400">
              Média do setor
            </div>
          </div>
        </div>

        {/* Machine Utilization */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start text-slate-400 mb-2">
            <span className="text-xs font-medium">Taxa Utilização</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{metrics.utilization}%</div>
            <div className="text-xs mt-1 text-emerald-400">
              {metrics.runningCount} de 8 Máquinas
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATIVE BEFORE X AFTER LEAN & HISTORICAL CHARTS (RF-3.1.2 & RF-3.1.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Before x After Lean Impact */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-sm text-white flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-cyan-400" />
              Impacto Lean 4.0: Comparativo "Antes x Depois"
            </h3>
            <span className="text-xs text-cyan-400 font-medium">Resultados Validados</span>
          </div>

          <div className="space-y-3">
            {/* Setup Comparison */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Tempo de Setup (SMED)</span>
                <span className="text-slate-400">90 min &rarr; <strong className="text-emerald-400">8.5 min (-90.5%)</strong></span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div className="bg-slate-600 h-full" style={{ width: '90%' }} title="Antes: 90min"></div>
                <div className="bg-emerald-500 h-full" style={{ width: '9.5%' }} title="Depois: 8.5min"></div>
              </div>
            </div>

            {/* OEE Comparison */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">OEE Geral da Fábrica</span>
                <span className="text-slate-400">52% &rarr; <strong className="text-cyan-400">83% (+31%)</strong></span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div className="bg-rose-500/60 h-full" style={{ width: '52%' }}></div>
                <div className="bg-cyan-500 h-full" style={{ width: '31%' }}></div>
              </div>
            </div>

            {/* WIP Comparison */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">WIP (Estoque Intermediário)</span>
                <span className="text-slate-400">280 pçs &rarr; <strong className="text-amber-400">104 pçs (-62.8%)</strong></span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div className="bg-amber-600/50 h-full" style={{ width: '100%' }}></div>
                <div className="bg-amber-400 h-full" style={{ width: '37%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Historical Indicators Selector (RF-3.1.3) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-semibold text-sm text-white flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-indigo-400" />
              Indicadores Históricos de Produção
            </h3>
            <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg text-xs">
              {['HOJE', 'SEMANA', 'MÊS'].map(p => (
                <button
                  key={p}
                  onClick={() => setHistoryPeriod(p)}
                  className={`px-2.5 py-1 rounded-md transition ${historyPeriod === p ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Simulated Historical Visual Curve */}
          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-2">
            {[65, 70, 68, 82, 85, 88, 84, 90, metrics.oee].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] text-slate-400">{val}%</span>
                <div 
                  className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all duration-500" 
                  style={{ height: `${val}%` }}
                ></div>
                <span className="text-[10px] text-slate-500">T{idx+1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 8 CNC MACHINES STATUS REAL-TIME GRID (RF-3.1.5) */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-cyan-400" />
          Status Operacional das 8 Máquinas CNC (Tempo Real)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {machines.map((m) => {
            const isRunning = m.status === 'RUNNING';
            const isSetup = m.status === 'SETUP';
            const isStopped = m.status === 'STOPPED';

            return (
              <div 
                key={m.id} 
                className={`p-4 rounded-xl border bg-slate-900/90 transition-all ${
                  isStopped ? 'border-rose-500/50 shadow-rose-500/5' :
                  isSetup ? 'border-amber-500/50 shadow-amber-500/5' : 'border-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-sm text-white">{m.name}</h4>
                    <span className="text-[11px] text-slate-400">ID: #{m.id}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    isSetup ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                    isStopped ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {m.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>OEE:</span>
                    <span className={`font-semibold ${m.oee < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{m.oee}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Ciclo Atual:</span>
                    <span>{m.cycleTime}s</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>WIP na máquina:</span>
                    <span>{m.wip} pçs</span>
                  </div>
                  {m.fault !== 'Nenhum' && (
                    <div className="mt-2 text-[11px] bg-rose-500/10 text-rose-300 p-1.5 rounded border border-rose-500/20 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{m.fault}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 2. DIGITAL TWIN SCREEN (RF-3.2)
// ==========================================
function DigitalTwinScreen({ machines, currentMetrics }) {
  // Parameters for What-If Simulation
  const [params, setParams] = useState({
    setupTime: 10,
    cycleTime: 40,
    productionVolume: 1200,
    machineCount: 8,
    dailyDemand: 1500
  });

  const [simulatedResults, setSimulatedResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Run What-If Simulation (RF-3.2.4 & RF-3.2.5)
  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      // Logic for simulated scenario calculation
      const simOEE = Math.min(98, Math.round(85 + (10 - params.setupTime) * 1.2 + (params.machineCount - 8) * 2));
      const simLeadTime = (2.4 * (params.cycleTime / 45) * (1500 / params.dailyDemand)).toFixed(1);
      const simWip = Math.round(currentMetrics.wip * (params.cycleTime / 45) * (8 / params.machineCount));
      const simThroughput = Math.round((params.machineCount * (86400 / params.cycleTime)) * (simOEE / 100));

      setSimulatedResults({
        oee: simOEE,
        leadTime: simLeadTime,
        wip: simWip,
        throughput: simThroughput
      });
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      
      {/* DIGITAL TWIN VISUAL CELL FLOW (RF-3.2.1 & RF-3.2.2) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="font-semibold text-sm text-white flex items-center">
            <Layers className="w-4 h-4 mr-2 text-cyan-400" />
            Representação Visual do Fluxo Produtivo CNC (Digital Twin)
          </h3>
          <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            Simulação em Tempo Real
          </span>
        </div>

        {/* Layout Visual do Setor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800/80">
          
          {/* Queue / Raw Material */}
          <div className="border border-dashed border-slate-700 p-3 rounded-lg flex flex-col justify-between bg-slate-900/30">
            <div className="text-xs font-semibold text-slate-400 mb-2">Entrada & Filas</div>
            <div className="text-center py-4">
              <Box className="w-8 h-8 text-amber-400 mx-auto mb-1 animate-pulse" />
              <span className="text-lg font-bold text-white">450 pçs</span>
              <p className="text-[11px] text-slate-500">Materia-Prima Inicial</p>
            </div>
            <div className="text-[10px] text-slate-400 bg-slate-800 p-1.5 rounded text-center">
              Fila Média: 15 min
            </div>
          </div>

          {/* CNC Cell Grid (8 Machines visual status) */}
          <div className="md:col-span-2 border border-slate-800 p-3 rounded-lg bg-slate-900/40">
            <div className="text-xs font-semibold text-slate-400 mb-2">Célula de Usinagem (8 CNCs)</div>
            <div className="grid grid-cols-4 gap-2">
              {machines.map(m => (
                <div 
                  key={m.id}
                  className={`p-2 rounded text-center border text-[11px] ${
                    m.status === 'RUNNING' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' :
                    m.status === 'SETUP' ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' :
                    'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="font-bold truncate">{m.name.split(' ')[0]}</div>
                  <div className="text-[9px] opacity-80">{m.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Intermediate WIP & Output */}
          <div className="border border-dashed border-slate-700 p-3 rounded-lg flex flex-col justify-between bg-slate-900/30">
            <div className="text-xs font-semibold text-slate-400 mb-2">Estoque Intermediário & Saída</div>
            <div className="text-center py-2">
              <span className="text-xs text-slate-400">WIP Atual:</span>
              <div className="text-xl font-bold text-amber-400">{currentMetrics.wip} pçs</div>
            </div>
            <div className="text-center border-t border-slate-800 pt-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
              <span className="text-xs font-semibold text-white">Acabados: 1,420 pçs</span>
            </div>
          </div>
        </div>
      </div>

      {/* WHAT-IF SIMULATION CONTROL & COMPARISON (RF-3.2.3, RF-3.2.4 & RF-3.2.5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Simulation Parameter Panel (RF-3.2.3) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white flex items-center border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 mr-2 text-cyan-400" />
            Parâmetros de Simulação
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 flex justify-between">
                <span>Tempo de Setup (min):</span>
                <span className="font-bold text-cyan-400">{params.setupTime} min</span>
              </label>
              <input 
                type="range" min="5" max="90" value={params.setupTime}
                onChange={e => setParams({...params, setupTime: Number(e.target.value)})}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 mt-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 flex justify-between">
                <span>Tempo de Ciclo Médio (s):</span>
                <span className="font-bold text-cyan-400">{params.cycleTime} s</span>
              </label>
              <input 
                type="range" min="20" max="120" value={params.cycleTime}
                onChange={e => setParams({...params, cycleTime: Number(e.target.value)})}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 mt-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 flex justify-between">
                <span>Quantidade de Máquinas:</span>
                <span className="font-bold text-cyan-400">{params.machineCount} CNCs</span>
              </label>
              <input 
                type="range" min="1" max="12" value={params.machineCount}
                onChange={e => setParams({...params, machineCount: Number(e.target.value)})}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 mt-1 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-slate-300 flex justify-between">
                <span>Demanda Diária (pçs):</span>
                <span className="font-bold text-cyan-400">{params.dailyDemand}</span>
              </label>
              <input 
                type="range" min="500" max="3000" step="100" value={params.dailyDemand}
                onChange={e => setParams({...params, dailyDemand: Number(e.target.value)})}
                className="w-full accent-cyan-400 bg-slate-800 rounded h-1.5 mt-1 cursor-pointer"
              />
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg shadow-lg flex items-center justify-center space-x-2 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSimulating ? 'Executando Simulação...' : 'Rodar Simulação What-If'}</span>
            </button>
          </div>
        </div>

        {/* Scenario Comparison Table (RF-3.2.5) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-sm text-white flex items-center border-b border-slate-800 pb-3">
            <BarChart3 className="w-4 h-4 mr-2 text-emerald-400" />
            Comparativo Automático: Cenário Atual vs Cenário Simulado
          </h3>

          {!simulatedResults ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Ajuste os parâmetros ao lado e clique em "Rodar Simulação What-If" para calcular o cenário.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Indicador Lean</th>
                    <th className="p-3">Cenário Atual</th>
                    <th className="p-3">Cenário Simulado</th>
                    <th className="p-3">Variação (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  <tr>
                    <td className="p-3 font-semibold text-white">OEE Projetado</td>
                    <td className="p-3">{currentMetrics.oee}%</td>
                    <td className="p-3 text-cyan-400 font-bold">{simulatedResults.oee}%</td>
                    <td className="p-3 font-bold text-emerald-400">
                      +{(simulatedResults.oee - currentMetrics.oee).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Lead Time Projetado</td>
                    <td className="p-3">{currentMetrics.leadTimeDays} dias</td>
                    <td className="p-3 text-cyan-400 font-bold">{simulatedResults.leadTime} dias</td>
                    <td className="p-3 font-bold text-emerald-400">
                      {((simulatedResults.leadTime - currentMetrics.leadTimeDays) / currentMetrics.leadTimeDays * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">WIP Intermediário</td>
                    <td className="p-3">{currentMetrics.wip} pçs</td>
                    <td className="p-3 text-cyan-400 font-bold">{simulatedResults.wip} pçs</td>
                    <td className="p-3 font-bold text-amber-400">
                      {((simulatedResults.wip - currentMetrics.wip) / currentMetrics.wip * 100).toFixed(1)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Capacidade diária</td>
                    <td className="p-3">1,420 pçs</td>
                    <td className="p-3 text-cyan-400 font-bold">{simulatedResults.throughput} pçs</td>
                    <td className="p-3 font-bold text-emerald-400">
                      +{(simulatedResults.throughput - 1420)} pçs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// ==========================================
// 3. E-KANBAN SCREEN (RF-3.3)
// ==========================================
function KanbanScreen() {
  const [orders, setOrders] = useState([
    { id: 'OP-101', part: 'Eixo Principal CNC', qty: 250, priority: 'Urgente', status: 'A_FAZER', batchSize: 50 },
    { id: 'OP-102', part: 'Flange de Precisão', qty: 500, priority: 'Normal', status: 'A_FAZER', batchSize: 100 },
    { id: 'OP-103', part: 'Suporte de Spindle', qty: 120, priority: 'Urgente', status: 'EM_PRODUCAO', batchSize: 30 },
    { id: 'OP-104', part: 'Acoplamento Flexível', qty: 800, priority: 'Normal', status: 'EM_PRODUCAO', batchSize: 200 },
    { id: 'OP-105', part: 'Engrenagem Helicoidal', qty: 300, priority: 'Normal', status: 'CONCLUIDO', batchSize: 75 },
  ]);

  const [newPart, setNewPart] = useState('');
  const [newQty, setNewQty] = useState(200);
  const [newPriority, setNewPriority] = useState('Normal');

  // Calculate Heijunka Batch Size (RF-3.3.3 & RF-3.3.4)
  const calculateBatchSize = (qty, priority) => {
    // Heijunka leveling algorithm logic
    const factor = priority === 'Urgente' ? 4 : 5;
    return Math.max(10, Math.round(qty / factor));
  };

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!newPart) return;

    const bSize = calculateBatchSize(newQty, newPriority);
    const newOp = {
      id: `OP-${Math.floor(100 + Math.random() * 900)}`,
      part: newPart,
      qty: Number(newQty),
      priority: newPriority,
      status: 'A_FAZER',
      batchSize: bSize
    };

    setOrders([newOp, ...orders]);
    setNewPart('');
  };

  const moveStatus = (id, newStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-6">
      
      {/* ORDER REGISTRATION FORM (RF-3.3.1, RF-3.3.2, RF-3.3.3) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <h3 className="font-semibold text-sm text-white flex items-center mb-4 border-b border-slate-800 pb-3">
          <Plus className="w-4 h-4 mr-2 text-cyan-400" />
          Registrar Nova Ordem de Produção & Nivelamento Heijunka
        </h3>

        <form onSubmit={handleAddOrder} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Nome da Peça / Componente</label>
            <input 
              type="text" 
              placeholder="Ex: Bucal de Bronze" 
              value={newPart} 
              onChange={e => setNewPart(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Quantidade Total</label>
            <input 
              type="number" 
              value={newQty} 
              onChange={e => setNewQty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">Prioridade (RF-3.3.2)</label>
            <select 
              value={newPriority} 
              onChange={e => setNewPriority(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Normal">Normal</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition flex items-center justify-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Gerar e-Kanban Otimizado</span>
          </button>
        </form>
      </div>

      {/* KANBAN BOARD (RF-3.3.5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column: A Fazer */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1.5 text-amber-400" /> A Fazer</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              {orders.filter(o => o.status === 'A_FAZER').length}
            </span>
          </div>

          {orders.filter(o => o.status === 'A_FAZER').map(item => (
            <KanbanCard key={item.id} item={item} onMove={moveStatus} nextStatus="EM_PRODUCAO" nextLabel="Iniciar Produção" />
          ))}
        </div>

        {/* Column: Em Produção */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center"><RefreshCw className="w-3.5 h-3.5 mr-1.5 text-cyan-400 animate-spin" /> Em Produção</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              {orders.filter(o => o.status === 'EM_PRODUCAO').length}
            </span>
          </div>

          {orders.filter(o => o.status === 'EM_PRODUCAO').map(item => (
            <KanbanCard key={item.id} item={item} onMove={moveStatus} nextStatus="CONCLUIDO" nextLabel="Concluir Ordem" />
          ))}
        </div>

        {/* Column: Concluído */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300 border-b border-slate-800 pb-2">
            <span className="flex items-center"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Concluído</span>
            <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              {orders.filter(o => o.status === 'CONCLUIDO').length}
            </span>
          </div>

          {orders.filter(o => o.status === 'CONCLUIDO').map(item => (
            <KanbanCard key={item.id} item={item} onMove={moveStatus} />
          ))}
        </div>

      </div>

    </div>
  );
}

function KanbanCard({ item, onMove, nextStatus, nextLabel }) {
  return (
    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2 shadow-sm">
      <div className="flex justify-between items-start">
        <span className="font-bold text-xs text-white">{item.id}</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          item.priority === 'Urgente' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
        }`}>
          {item.priority}
        </span>
      </div>

      <div className="text-xs text-slate-300 font-medium">{item.part}</div>

      <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
        <span>Qtd: {item.qty} pçs</span>
        <span className="text-cyan-400">Lote Heijunka: {item.batchSize}</span>
      </div>

      {nextStatus && (
        <button
          onClick={() => onMove(item.id, nextStatus)}
          className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition flex items-center justify-center space-x-1"
        >
          <span>{nextLabel}</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ==========================================
// 4. IOT & CLP DELTA DVP-SE INTEGRATION SCREEN (RF-3.5)
// ==========================================
function IoTClpScreen({ machines, clpMemory, clpRegisters, onCoilToggle }) {
  return (
    <div className="space-y-6">
      
      {/* CLP DELTA DVP-SE HARDWARE CONTROL PANEL */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">CLP Delta DVP-SE (Modbus TCP/IP)</h3>
              <p className="text-xs text-slate-400">Painel de Comandos M0-M5 & Registradores D0-D2</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-mono">
            IP: 192.168.1.50:502
          </span>
        </div>

        {/* COILS / MEMORY SIGNALS CONTROL (M0 - M5) */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-3">Sinais de Comando de Memória (Writing Coils):</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* M0 Emergency */}
            <button
              onClick={() => onCoilToggle('M0')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                clpMemory.M0 
                  ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-lg shadow-rose-600/30' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="text-xs font-bold">M0: Emergency</span>
              <span className="text-[10px] opacity-80">{clpMemory.M0 ? 'ACTIVATED' : 'OFF'}</span>
            </button>

            {/* M1 Safety Condition */}
            <button
              onClick={() => onCoilToggle('M1')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                clpMemory.M1 
                  ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs font-bold">M1: Safety</span>
              <span className="text-[10px] opacity-80">{clpMemory.M1 ? 'SAFE (OK)' : 'TRIPPED'}</span>
            </button>

            {/* M2 Start */}
            <button
              onClick={() => onCoilToggle('M2')}
              className="p-3 rounded-lg border bg-slate-950 border-slate-800 text-emerald-400 hover:border-emerald-500/50 flex flex-col items-center justify-center space-y-1 transition"
            >
              <Play className="w-5 h-5" />
              <span className="text-xs font-bold">M2: Start</span>
              <span className="text-[10px] text-slate-500">Pulse Signal</span>
            </button>

            {/* M3 Stop */}
            <button
              onClick={() => onCoilToggle('M3')}
              className="p-3 rounded-lg border bg-slate-950 border-slate-800 text-amber-400 hover:border-amber-500/50 flex flex-col items-center justify-center space-y-1 transition"
            >
              <Square className="w-5 h-5" />
              <span className="text-xs font-bold">M3: Stop</span>
              <span className="text-[10px] text-slate-500">Normal Stop</span>
            </button>

            {/* M4 Reset */}
            <button
              onClick={() => onCoilToggle('M4')}
              className="p-3 rounded-lg border bg-slate-950 border-slate-800 text-blue-400 hover:border-blue-500/50 flex flex-col items-center justify-center space-y-1 transition"
            >
              <RotateCcw className="w-5 h-5" />
              <span className="text-xs font-bold">M4: Reset</span>
              <span className="text-[10px] text-slate-500">Clear Faults</span>
            </button>

            {/* M5 Tools PlugIn */}
            <button
              onClick={() => onCoilToggle('M5')}
              className={`p-3 rounded-lg border flex flex-col items-center justify-center space-y-1 transition ${
                clpMemory.M5 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' 
                  : 'bg-slate-950 border-slate-800 text-slate-500'
              }`}
            >
              <Wrench className="w-5 h-5" />
              <span className="text-xs font-bold">M5: Tools Plug</span>
              <span className="text-[10px] opacity-80">{clpMemory.M5 ? 'CONNECTED' : 'DISCONNECTED'}</span>
            </button>

          </div>
        </div>

        {/* READ REGISTERS (D0, D1, D2) */}
        <div>
          <h4 className="text-xs font-semibold text-slate-300 mb-3">Leitura dos Registradores de Dados (Holding Registers):</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* D0 Status Machine */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">D0: Status Machine</div>
              <div className="text-xl font-bold text-white font-mono">
                {clpRegisters.D0} - {
                  clpRegisters.D0 === 1 ? 'RUNNING' :
                  clpRegisters.D0 === 0 ? 'STOPPED' :
                  clpRegisters.D0 === 2 ? 'SETUP' : 'FAULT / E-STOP'
                }
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Registrador de estado principal</div>
            </div>

            {/* D1 Fault Status */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">D1: Fault Status</div>
              <div className={`text-xl font-bold font-mono ${clpRegisters.D1 === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {clpRegisters.D1} {clpRegisters.D1 === 0 ? '(NORMAL)' : `(ERRO #${clpRegisters.D1})`}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Código de diagnóstico de falhas</div>
            </div>

            {/* D2 Production Counter */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-400 mb-1">D2: Production Counter</div>
              <div className="text-xl font-bold text-cyan-400 font-mono">
                {clpRegisters.D2} <span className="text-xs font-normal text-slate-400">peças</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Contador total de peças ciclo</div>
            </div>

          </div>
        </div>
      </div>

      {/* MQTT & SENSOR TELEMETRY REAL-TIME MONITOR (RF-3.5.1, RF-3.5.2) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-sm text-white flex items-center border-b border-slate-800 pb-3">
          <Wifi className="w-4 h-4 mr-2 text-cyan-400" />
          Telemetria IoT em Tempo Real (MQTT Broker Topic: <code className="text-cyan-300 ml-1">factory/cnc/+/telemetry</code>)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Máquina CNC</th>
                <th className="p-3">Estado (RF-3.5.2)</th>
                <th className="p-3">Tempo Ciclo</th>
                <th className="p-3">Tempo Setup</th>
                <th className="p-3">Pacotes MQTT Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {machines.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-white">{m.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400' :
                      m.status === 'SETUP' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="p-3">{m.cycleTime}s</td>
                  <td className="p-3">{m.setupTime} min</td>
                  <td className="p-3 font-mono text-slate-400 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mr-2 animate-ping"></span>
                    200 OK (qoS 1)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ==========================================
// 5. REPORTS SCREEN (RF-3.4)
// ==========================================
function ReportsScreen({ machines, metrics }) {
  const [downloadMsg, setDownloadMsg] = useState('');

  const handleExport = (format) => {
    setDownloadMsg(`Gerando arquivo relatorio_lean_cnc.${format.toLowerCase()}...`);
    setTimeout(() => {
      setDownloadMsg(`Relatório exportado com sucesso em .${format}!`);
      setTimeout(() => setDownloadMsg(''), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* EXPORT BUTTONS & HEADER (RF-3.4.4) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-white">Relatórios e Histórico Operacional</h3>
          <p className="text-xs text-slate-400">Armazenamento histórico de 12 meses (RNF-4.8)</p>
        </div>

        <div className="flex items-center space-x-2">
          {['PDF', 'Excel', 'CSV'].map(fmt => (
            <button
              key={fmt}
              onClick={() => handleExport(fmt)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Exportar {fmt}</span>
            </button>
          ))}
        </div>
      </div>

      {downloadMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-lg flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {downloadMsg}
        </div>
      )}

      {/* STOP EVENTS & HISTORICAL DATA LOG (RF-3.4.1, RF-3.4.2, RF-3.4.3) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-sm text-white border-b border-slate-800 pb-3">
          Histórico de Eventos de Parada e Métricas Registradas
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Data / Hora</th>
                <th className="p-3">Máquina CNC</th>
                <th className="p-3">Evento Registrado</th>
                <th className="p-3">Duração</th>
                <th className="p-3">Impacto OEE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-mono text-slate-400">2026-10-20 14:22</td>
                <td className="p-3 font-semibold text-white">CNC-05 (Centro 5E)</td>
                <td className="p-3 text-rose-400">Aquecimento de Spindle (Falha #101)</td>
                <td className="p-3">42 min</td>
                <td className="p-3 text-rose-400">-12%</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-mono text-slate-400">2026-10-20 11:05</td>
                <td className="p-3 font-semibold text-white">CNC-03 (Centro 3E)</td>
                <td className="p-3 text-amber-400">Troca de Ferramenta (Setup Excedido)</td>
                <td className="p-3">14 min</td>
                <td className="p-3 text-amber-400">-4%</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-mono text-slate-400">2026-10-20 09:15</td>
                <td className="p-3 font-semibold text-white">CLP Delta DVP-SE</td>
                <td className="p-3 text-blue-400">Acionamento M2 (Start de Produção Lote OP-103)</td>
                <td className="p-3">--</td>
                <td className="p-3 text-emerald-400">+5%</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="p-3 font-mono text-slate-400">2026-10-20 08:00</td>
                <td className="p-3 font-semibold text-white">Todas (Setor CNC)</td>
                <td className="p-3 text-emerald-400">Setup SMED concluído com sucesso</td>
                <td className="p-3">8.5 min</td>
                <td className="p-3 text-emerald-400">+15%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}