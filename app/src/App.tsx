import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

import { BehaviorSimulator } from './lib/BehaviorSimulator';
import { FingerprintRotator } from './lib/FingerprintRotator';
import { ReferrerManager } from './lib/ReferrerManager';
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
  primaryKeywords?: string[];
  pasfKeywords?: string[];
}

interface Proxy { id: string; address: string; source: string; }
interface LogEntry { id: string; message: string; timestamp: Date; type?: 'work' | 'error'; }
interface CurrentJob { status: string; campaign: string; url: string; flag: string; }
interface GA4Event { id: string; eventName: string; campaignName: string; timestamp: Date; params: any; }
type WAFMode = 'Standard' | 'Stealth' | 'Ghost';

const TRAFFIC_TYPES = ["Organic Search (Google/Bing)", "AI Agents (ChatGPT)", "Social Media Matrix", "Referral", "Direct"];
const REGIONS = ['Europe', 'North America', 'Asia', 'Africa'];
const COUNTRY_CODES: any = { 'Europe': ['DE', 'FR', 'GB'], 'North America': ['US', 'CA'], 'Asia': ['JP', 'IN'], 'Africa': ['MA', 'ZA'] };

const formatUrlToTitle = (url: string) => { try { return new URL(url).hostname; } catch { return 'URL'; } };

function App() {
  const [userData, setUserData] = useState({ credits: 500 });
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    { id: 'c1', name: 'SEO Boost', status: 'active', trafficType: 'Organic Search (Google/Bing)', urls: ['https://example.com'], targeting: { region: 'Europe', countryCode: 'DE' }, ga4Id: 'G-123', stats: { hits: 100 }, trafficPattern: 'Pulse' }
  ]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("Europe");
  const [wafMode, setWafMode] = useState<WAFMode>('Ghost');
  const [ga4Events, setGa4Events] = useState<GA4Event[]>([]);

  const behaviorSim = useMemo(() => new BehaviorSimulator(), []);
  const fingerprinter = useMemo(() => new FingerprintRotator(), []);
  const referrerMgr = useMemo(() => new ReferrerManager(), []);
  const orchestrator = useMemo(() => new SessionOrchestrator(), []);

  const engineTimerRef = useRef<any>(null);
  const campaignsRef = useRef(campaigns);
  useEffect(() => { campaignsRef.current = campaigns; }, [campaigns]);

  const runTrafficEngine = useCallback(() => {
    if (!isEngineRunning) return;
    const active = campaignsRef.current.filter(c => c.status === 'active');
    if (active.length === 0) { engineTimerRef.current = setTimeout(runTrafficEngine, 2000); return; }

    const job = active[Math.floor(Math.random() * active.length)];
    const url = job.urls[0];
    const session = orchestrator.generateSession(job);
    const fingerprint = fingerprinter.getFingerprint(job.targetOS || 'Random OS');
    const referrer = referrerMgr.getReferrer(job.trafficType);

    setCurrentJob({ status: 'SENDING', campaign: job.name, url, flag: job.targeting.countryCode });
    setCampaigns(prev => prev.map(c => c.id === job.id ? { ...c, stats: { hits: c.stats.hits + 1 } } : c));
    
    const log: LogEntry = { id: 'l'+Date.now(), message: `HIT: ${new URL(url).hostname} | SRC: ${referrer.split('/')[2] || 'Direct'} | PATTERN: ${job.trafficPattern || 'Linear'}`, timestamp: new Date(), type: 'work' };
    setLogs(prev => [log, ...prev.slice(0, 99)]);

    let delay = 2000;
    if (job.trafficPattern === 'Pulse') delay = Math.random() > 0.7 ? 500 : 4000;
    else if (job.trafficPattern === 'Viral') delay = Math.max(500, 2000 * (1 - Math.min(0.8, job.stats.hits / 1000)));

    engineTimerRef.current = setTimeout(runTrafficEngine, delay);
  }, [isEngineRunning, orchestrator, fingerprinter, referrerMgr]);

  useEffect(() => { if (isEngineRunning) runTrafficEngine(); else if (engineTimerRef.current) clearTimeout(engineTimerRef.current); }, [isEngineRunning, runTrafficEngine]);

  const toggleCampaignStatus = (c: Campaign) => setCampaigns(prev => prev.map(cam => cam.id === c.id ? { ...cam, status: cam.status === 'active' ? 'paused' : 'active' } : cam));
  const handleSaveCampaign = (e: any) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pattern = fd.get('trafficPattern') as string || 'Linear';
    const nc: Campaign = {
      id: editingCampaign?.id || 'c' + Date.now(),
      name: fd.get('name') as string,
      trafficType: fd.get('trafficType') as string,
      urls: [fd.get('url') as string],
      targeting: { region: fd.get('region') as string, countryCode: fd.get('country') as string },
      ga4Id: fd.get('ga4Id') as string || null,
      status: editingCampaign?.status || 'paused',
      stats: editingCampaign?.stats || { hits: 0 },
      trafficPattern: pattern,
      minTime: 40, conversionRate: 5, bounceRate: 40, dailyBudget: 1000
    };
    if (editingCampaign) setCampaigns(prev => prev.map(c => c.id === nc.id ? nc : c));
    else setCampaigns(prev => [...prev, nc]);
    setShowModal(false); setEditingCampaign(null);
  };

  return (
    <div className="h-screen flex bg-slate-50 font-sans text-sm overflow-hidden">
      <aside className="w-64 bg-white border-r flex flex-col p-6">
        <h1 className="font-bold text-lg mb-8">TrafficFlow</h1>
        <nav className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : ''}`}>Dashboard</button>
          <button onClick={() => setActiveTab('campaigns')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'campaigns' ? 'bg-blue-600 text-white' : ''}`}>Campaigns</button>
          <button onClick={() => setActiveTab('logs')} className={`w-full p-3 rounded-xl text-left ${activeTab === 'logs' ? 'bg-blue-600 text-white' : ''}`}>Logs</button>
        </nav>
        <div className="mt-auto p-4 bg-slate-100 rounded-xl">
          <div className="text-xs font-bold mb-2">{isEngineRunning ? 'ONLINE' : 'PAUSED'}</div>
          <button onClick={() => setIsEngineRunning(!isEngineRunning)} className="w-full py-2 bg-blue-600 text-white rounded-lg">{isEngineRunning ? 'STOP' : 'START'}</button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Command Center</h2>
          <button onClick={() => { setShowModal(true); setEditingCampaign(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg">+ New Campaign</button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-2xl shadow-sm border">
              <div className="text-xs font-bold text-slate-500 uppercase">Total Hits</div>
              <div className="text-3xl font-bold">{campaigns.reduce((s,c)=>s+c.stats.hits,0)}</div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                <tr><th className="p-4">Name</th><th className="p-4">Status</th><th className="p-4">Pattern</th><th className="p-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map(c => (
                  <tr key={c.id}>
                    <td className="p-4 font-bold">{c.name}</td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100'}`}>{c.status}</span></td>
                    <td className="p-4">{c.trafficPattern}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => toggleCampaignStatus(c)} className="mr-2 p-1 border rounded">Play/Pause</button>
                      <button onClick={() => { setEditingCampaign(c); setShowModal(true); }} className="p-1 border rounded">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white p-6 rounded-xl border shadow-sm h-[500px] overflow-y-auto font-mono text-xs">
            {logs.map(l => <div key={l.id} className="mb-1 border-b pb-1"><span className="text-slate-400">[{l.timestamp.toLocaleTimeString()}]</span> {l.message}</div>)}
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8">
            <h3 className="text-xl font-bold mb-6">{editingCampaign ? 'Edit' : 'New'} Campaign</h3>
            <form onSubmit={handleSaveCampaign} className="space-y-4">
              <input name="name" defaultValue={editingCampaign?.name || ''} placeholder="Name" required className="w-full p-3 border rounded-xl" />
              <input name="url" defaultValue={editingCampaign?.urls[0] || ''} placeholder="URL" required className="w-full p-3 border rounded-xl" />
              <div className="flex gap-4">
                <select name="region" value={selectedRegion} onChange={e=>setSelectedRegion(e.target.value)} className="flex-1 p-3 border rounded-xl">
                  {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select name="country" defaultValue={editingCampaign?.targeting.countryCode || 'US'} className="flex-1 p-3 border rounded-xl">
                  {COUNTRY_CODES[selectedRegion]?.map((c:string) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl">
                <div className="text-xs font-bold mb-2">Traffic Pattern</div>
                <div className="flex gap-4">
                  {['Linear', 'Viral', 'Pulse'].map(p => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="trafficPattern" value={p} defaultChecked={editingCampaign?.trafficPattern === p || (!editingCampaign && p === 'Linear')} /> {p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
