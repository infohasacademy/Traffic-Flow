import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import './App.css';
import { BehaviorSimulator } from './lib/BehaviorSimulator';
import { FingerprintRotator } from './lib/FingerprintRotator';
import ReferrerManager from './lib/ReferrerManager';
import { SessionOrchestrator } from './lib/SessionOrchestrator';

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused';
  trafficType: string;
  urls: string[];
  targeting: { region: string; countryCode: string };
  ga4Id: string | null;
  stats: { hits: number };
  ecommerceMode?: boolean;
  useProxies?: boolean;
  businessHoursOnly?: boolean;
  returnRate?: boolean;
  minTime?: number;
  conversionRate?: number;
  bounceRate?: number;
  dailyBudget?: number;
  targetOS?: string;
  trafficPattern?: string;
  keyword?: string;
  searchEngine?: string;
  depth?: number;
}

interface LogEntry { id: string; message: string; timestamp: Date; type?: 'work' | 'error'; }
interface CurrentJob { status: string; campaign: string; url: string; flag: string; }

type WAFMode = 'Standard' | 'Stealth' | 'Ghost';

const TRAFFIC_TYPES = ["Organic Search (Google/Bing)", "AI Agents (ChatGPT)", "Social Media Matrix", "Referral", "Direct"];
const SEARCH_ENGINES = ['google', 'bing', 'yahoo', 'duckduckgo'];
const REGIONS = ['Europe', 'North America', 'Asia', 'Africa'];
const COUNTRY_CODES: any = { 'Europe': ['DE', 'FR', 'GB'], 'North America': ['US', 'CA'], 'Asia': ['JP', 'IN'], 'Africa': ['MA', 'ZA'] };

function App() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { 
      id: 'c1', 
      name: 'SEO Boost', 
      status: 'active', 
      trafficType: 'Organic Search (Google/Bing)', 
      urls: ['https://example.com'], 
      targeting: { region: 'Europe', countryCode: 'DE' }, 
      ga4Id: 'G-123', 
      stats: { hits: 100 }, 
      trafficPattern: 'Pulse',
      keyword: 'web automation',
      searchEngine: 'google',
      depth: 3
    }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("Europe");

  const engineTimerRef = useRef<any>(null);
  const campaignsRef = useRef(campaigns);
  useEffect(() => { campaignsRef.current = campaigns; }, [campaigns]);

  const runTrafficEngine = useCallback(() => {
    if (!isEngineRunning) return;
    const active = campaignsRef.current.filter(c => c.status === 'active');
    if (active.length === 0) {
      engineTimerRef.current = setTimeout(runTrafficEngine, 2000);
      return;
    }

    const job = active[Math.floor(Math.random() * active.length)];
    const url = job.urls[0];
    
    // Use the new SessionOrchestrator logic
    const orchestrator = new SessionOrchestrator({
      targetUrl: url,
      keyword: job.keyword || 'traffic flow',
      searchEngine: job.searchEngine || 'google',
      depth: job.depth || 2,
      deviceType: 'desktop'
    });

    const fingerprint = FingerprintRotator.generateFingerprint('desktop');
    const referrer = ReferrerManager.generateOrganicReferrer(job.keyword || 'search', job.searchEngine || 'google');
    
    setCurrentJob({ status: 'SENDING', campaign: job.name, url, flag: job.targeting.countryCode });
    setCampaigns(prev => prev.map(c => c.id === job.id ? { ...c, stats: { hits: c.stats.hits + 1 } } : c));
    
    const log: LogEntry = { 
      id: 'l'+Date.now(), 
      message: `HIT: ${new URL(url).hostname} | SRC: ${job.searchEngine || 'Direct'} | PATTERN: ${job.trafficPattern || 'Linear'}`, 
      timestamp: new Date(), 
      type: 'work' 
    };
    setLogs(prev => [log, ...prev.slice(0, 99)]);

    let delay = 2000;
    const pattern = job.trafficPattern;
    if (pattern === 'Pulse') delay = Math.random() > 0.7 ? 500 : 4000;
    else if (pattern === 'Viral') delay = Math.max(500, 2000 * (1 - Math.min(0.8, job.stats.hits / 1000)));
    
    engineTimerRef.current = setTimeout(runTrafficEngine, delay);
  }, [isEngineRunning]);

  useEffect(() => {
    if (isEngineRunning) runTrafficEngine();
    else if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
  }, [isEngineRunning, runTrafficEngine]);

  const toggleCampaignStatus = (c: Campaign) => setCampaigns(prev => prev.map(cam => cam.id === c.id ? { ...cam, status: cam.status === 'active' ? 'paused' : 'active' } : cam));

  const handleSaveCampaign = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    
    const pattern = fd.get('trafficPattern') as string || 'Linear';
    
    const nc: Campaign = {
      ...(editingCampaign || {
        id: 'c' + Date.now(),
        status: 'paused',
        stats: { hits: 0 },
      }),
      name: fd.get('name') as string,
      trafficType: fd.get('trafficType') as string || "Organic Search (Google/Bing)",
      urls: [fd.get('url') as string],
      targeting: { 
        region: fd.get('region') as string, 
        countryCode: fd.get('country') as string 
      },
      ga4Id: fd.get('ga4Id') as string || null,
      trafficPattern: pattern,
      keyword: fd.get('keyword') as string || '',
      searchEngine: fd.get('searchEngine') as string || 'google',
      depth: parseInt(fd.get('depth') as string) || 2,
      ecommerceMode: fd.get('ecommerceMode') === 'on',
    };

    if (editingCampaign) setCampaigns(prev => prev.map(c => c.id === nc.id ? nc : c));
    else setCampaigns(prev => [...prev, nc]);
    
    setShowModal(false); 
    setEditingCampaign(null);
  };

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-sm overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col p-6">
        <h1 className="font-bold text-lg mb-8 text-blue-600">TrafficFlow V1.5</h1>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('campaigns')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'campaigns' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100'}`}>Campaigns</button>
          <button onClick={() => setActiveTab('logs')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100'}`}>Logs</button>
        </nav>
        <div className="mt-auto p-4 bg-slate-100 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-2 h-2 rounded-full ${isEngineRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isEngineRunning ? 'System Online' : 'System Paused'}</div>
          </div>
          <button onClick={() => setIsEngineRunning(!isEngineRunning)} className={`w-full py-3 rounded-xl font-bold transition-all ${isEngineRunning ? 'bg-rose-500 text-white shadow-rose-200 shadow-lg' : 'bg-blue-600 text-white shadow-blue-200 shadow-lg'}`}>
            {isEngineRunning ? 'STOP ENGINE' : 'START ENGINE'}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Command Center</h2>
            <p className="text-slate-500">Organic Traffic & SEO Orchestration</p>
          </div>
          <button onClick={() => { setShowModal(true); setEditingCampaign(null); }} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center gap-2">
            <span>+</span> New Campaign
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-4 gap-6">
            <div className="p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Hits</div>
              <div className="text-4xl font-bold text-slate-800">{campaigns.reduce((s,c)=>s+c.stats.hits,0)}</div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="p-6">Campaign Strategy</th>
                  <th className="p-6 text-center">Status</th>
                  <th className="p-6 text-center">Pattern</th>
                  <th className="p-6 text-center">SEO Score</th>
                  <th className="p-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="p-6">
                      <div className="font-bold text-slate-700">{c.name}</div>
                      <div className="text-xs text-slate-400 truncate max-w-xs">{c.urls[0]}</div>
                    </td>
                    <td className="p-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.status}</span>
                    </td>
                    <td className="p-6 text-center font-medium text-slate-600">{c.trafficPattern}</td>
                    <td className="p-6 text-center">
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-blue-500" style={{width: '85%'}}></div>
                      </div>
                    </td>
                    <td className="p-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => toggleCampaignStatus(c)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 mr-2">⏯️</button>
                      <button onClick={() => { setEditingCampaign(c); setShowModal(true); }} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200">✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl h-[600px] overflow-y-auto font-mono text-[11px] text-emerald-400/80 border border-slate-800">
            <div className="mb-4 text-slate-500 border-b border-slate-800 pb-2">Traffic Flow Engine Logs - v1.5</div>
            {logs.map(l => (
              <div key={l.id} className="mb-1.5 flex gap-4">
                <span className="text-slate-600 shrink-0">[{l.timestamp.toLocaleTimeString()}]</span> 
                <span className={l.message.includes('HIT') ? 'text-emerald-400' : 'text-rose-400'}>{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl border border-white/20">
            <h3 className="text-2xl font-bold mb-8 text-slate-800">{editingCampaign ? 'Edit Strategy' : 'New Organic Strategy'}</h3>
            <form onSubmit={handleSaveCampaign} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Campaign Name</label>
                  <input name="name" defaultValue={editingCampaign?.name || ''} placeholder="Targeting Keyword or Brand" required className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Target URL</label>
                  <input name="url" defaultValue={editingCampaign?.urls[0] || ''} placeholder="https://..." required className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Organic Keyword</label>
                  <input name="keyword" defaultValue={editingCampaign?.keyword || ''} placeholder="SEO Keyword" className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Search Engine</label>
                  <select name="searchEngine" defaultValue={editingCampaign?.searchEngine || 'google'} className="w-full p-4 bg-slate-50 border-none rounded-2xl appearance-none">
                    {SEARCH_ENGINES.map(e => <option key={e} value={e}>{e.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Navigation Depth</label>
                  <input type="number" name="depth" defaultValue={editingCampaign?.depth || 2} min="1" max="5" className="w-full p-4 bg-slate-50 border-none rounded-2xl" />
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50">
                <div className="text-[10px] font-bold text-blue-400 uppercase mb-4 tracking-widest">Traffic Flow Pattern</div>
                <div className="flex gap-8">
                  {['Linear', 'Viral', 'Pulse'].map(p => (
                    <label key={p} className="flex items-center gap-3 cursor-pointer group">
                      <input type="radio" name="trafficPattern" value={p} defaultChecked={editingCampaign?.trafficPattern === p || (!editingCampaign && p === 'Linear')} className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500" /> 
                      <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-6 px-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="ecommerceMode" defaultChecked={editingCampaign?.ecommerceMode} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600" />
                  <span className="text-sm font-bold text-slate-600">E-commerce Simulation</span>
                </label>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 font-bold text-slate-400 hover:text-slate-600 transition-colors">Discard</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Save Strategy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
