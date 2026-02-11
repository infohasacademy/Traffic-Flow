import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

// Types
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

interface Proxy {
  id: string;
  address: string;
  source: string;
  addedAt?: Date;
}

interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type?: 'work' | 'error';
}

interface CurrentJob {
  status: string;
  campaign: string;
  url: string;
  flag: string;
}

interface GA4Event {
  id: string;
  eventName: string;
  campaignName: string;
  timestamp: Date;
  params: Record<string, string | number>;
}

type WAFMode = 'Standard' | 'Stealth' | 'Ghost';

// Constants
const TRAFFIC_SOURCES_DATA = [
  { name: 'Organic Search', value: 35, color: '#3b82f6' },
  { name: 'Social Media', value: 25, color: '#10b981' },
  { name: 'Direct', value: 15, color: '#f59e0b' },
  { name: 'Referral', value: 10, color: '#ef4444' },
  { name: 'AI Chatbots', value: 8, color: '#8b5cf6' },
  { name: 'Local SEO', value: 7, color: '#ec4899' }
];

const REGIONS = ['Europe', 'North America', 'South America', 'Asia', 'Africa', 'Oceania'];

const COUNTRY_CODES: Record<string, string[]> = {
  'Europe': ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'CH', 'SE', 'NO'],
  'North America': ['US', 'CA', 'MX'],
  'South America': ['BR', 'AR', 'CL', 'CO', 'PE'],
  'Asia': ['JP', 'IN', 'KR', 'SG', 'HK', 'TH', 'VN', 'ID', 'AE', 'SA'],
  'Africa': ['MA', 'ZA', 'EG', 'NG', 'KE'],
  'Oceania': ['AU', 'NZ']
};

const TRAFFIC_TYPES = [
  "Organic Search (Google/Bing)",
  "Voice Search (Siri/Alexa)",
  "Google Discover",
  "AI Agents (ChatGPT)",
  "Local SEO (Maps/GMB)",
  "Social Media Matrix",
  "High Authority Referral",
  "Partner Network (Real)",
  "Direct / None"
];

// Utility functions
const formatUrlToTitle = (url: string): string => {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname.length > 1 ? u.pathname.substring(0, 15) + "..." : "");
  } catch {
    return url.substring(0, 30) + '...';
  }
};

const generateMockProxies = (count: number): Proxy[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `proxy-${i}`,
    address: `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 9000) + 1000}`,
    source: 'Scrape'
  }));
};

// Memoized Components
const StatCard = memo(({ title, value, icon, color, subtext, trend }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  subtext: string;
  trend?: string;
}) => (
  <div className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all relative overflow-hidden group`}>
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity ${color}`}>
      {icon}
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-1">{title}</h3>
          <div className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl ${color} bg-opacity-10 text-slate-700 dark:text-slate-200`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {trend && <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{trend}</span>}
        <span className="text-xs text-slate-400 font-medium">{subtext}</span>
      </div>
    </div>
  </div>
));

const SidebarNavItem = memo(({ tab, activeTab, onClick, icon, badge }: {
  tab: string;
  activeTab: string;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 mb-1 rounded-xl transition-all duration-200 group ${
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-500 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={activeTab === tab ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}>
        {icon}
      </div>
      <span className="font-medium text-sm">
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">{badge}</span>
    )}
  </button>
));

const CampaignRow = memo(({ campaign, onToggle, onEdit, onDelete, onDownload }: {
  campaign: Campaign;
  onToggle: (c: Campaign) => void;
  onEdit: (c: Campaign) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onDownload: (c: Campaign, e: React.MouseEvent) => void;
}) => (
  <tr
    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
    onClick={() => onEdit(campaign)}
  >
    <td className="px-6 py-4">
      <div className="font-bold text-slate-900 dark:text-white mb-1">{campaign.name}</div>
      <div className="text-xs text-slate-400 font-mono truncate max-w-[250px]">
        {campaign.urls[0]}
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border ${
        campaign.status === 'active'
          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
          : 'bg-slate-100 text-slate-500 border-slate-200'
      }`}>
        {campaign.status}
      </span>
    </td>
    <td className="px-6 py-4">
      <div className="flex gap-2">
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
          {campaign.targeting.countryCode || 'GL'}
        </span>
        {campaign.ga4Id && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">GA4</span>
        )}
        {campaign.ecommerceMode && (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">SHOP</span>
        )}
      </div>
    </td>
    <td className="px-6 py-4 text-right">
      <div className="flex justify-end gap-2 items-center">
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(campaign); }}
          className={`p-2 border rounded hover:bg-slate-50 z-50 relative ${
            campaign.status === 'active'
              ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
              : 'text-slate-400 hover:text-emerald-600 border-slate-200'
          }`}
          title={campaign.status === 'active' ? "Pause Campaign" : "Run Campaign"}
        >
          {campaign.status === 'active' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(campaign, e); }}
          className="p-2 border rounded hover:bg-slate-50 text-slate-500 z-50 relative"
          title="Download Report"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v10l4-4m-4 4-4-4m8 0 4 4m-4-4v10" />
            <path d="M2 12h20" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(campaign); }}
          className="p-2 border rounded hover:bg-slate-50 text-slate-500 z-10"
          title="Edit Campaign"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
        <button
          onClick={(e) => onDelete(campaign.id, e)}
          className="p-2 border rounded hover:bg-slate-50 text-slate-500 hover:text-red-500 hover:border-red-200 z-50 relative"
          title="Delete Campaign"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </td>
  </tr>
));

// Main App Component
function App() {
  // State
  const [, setUserData] = useState({ credits: 500, role: 'user', wafMode: 'stealth' });
  const [campaigns, setCampaigns] = useState<Campaign[]>([
    {
      id: 'camp-1',
      name: 'Premium SEO Boost',
      status: 'active',
      trafficType: 'Organic Search (Google/Bing)',
      urls: ['https://example.com/landing'],
      targeting: { region: 'Europe', countryCode: 'DE' },
      ga4Id: 'G-DEMO123456',
      stats: { hits: 124 },
      ecommerceMode: true,
      useProxies: true
    },
    {
      id: 'camp-2',
      name: 'Local Business Traffic',
      status: 'paused',
      trafficType: 'Local SEO (Maps/GMB)',
      urls: ['https://localbiz.example.com'],
      targeting: { region: 'North America', countryCode: 'US' },
      ga4Id: 'G-DEMO789012',
      stats: { hits: 87 },
      businessHoursOnly: true
    },
    {
      id: 'camp-3',
      name: 'E-commerce Surge',
      status: 'paused',
      trafficType: 'Social Media Matrix',
      urls: ['https://shop.example.com/products'],
      targeting: { region: 'Asia', countryCode: 'JP' },
      ga4Id: 'G-DEMO345678',
      stats: { hits: 215 },
      ecommerceMode: true,
      returnRate: true
    }
  ]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [scrapping, setScrapping] = useState(false);
  const [currentJob, setCurrentJob] = useState<CurrentJob | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showEditCampaignModal, setShowEditCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedRegion, setSelectedRegion] = useState("Europe");
  
  // Enterprise tab state
  const [wafMode, setWafMode] = useState<WAFMode>('Ghost');
  const [referrerUrl, setReferrerUrl] = useState('');
  const [referrerStatus, setReferrerStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [ga4Events, setGa4Events] = useState<GA4Event[]>([]);

  // Refs
  const engineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const campaignsRef = useRef(campaigns);
  const isEngineRunningRef = useRef(isEngineRunning);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep refs updated
  useEffect(() => { campaignsRef.current = campaigns; }, [campaigns]);
  useEffect(() => { isEngineRunningRef.current = isEngineRunning; }, [isEngineRunning]);

  // Initialize mock data
  useEffect(() => {
    setProxies(generateMockProxies(15));
    const initialLogs: LogEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: `log-${Date.now()}-${i}`,
      message: `System initialized successfully`,
      timestamp: new Date(Date.now() - i * 60000)
    }));
    setLogs(initialLogs);
  }, []);

  // Memoized values
  const totalHits = useMemo(() => 
    campaigns.reduce((sum, c) => sum + (c.stats?.hits || 0), 0),
    [campaigns]
  );

  const activeCampaignsCount = useMemo(() => 
    campaigns.filter(c => c.status === 'active').length,
    [campaigns]
  );

  // Engine simulation
  const runTrafficEngine = useCallback(() => {
    if (!isEngineRunningRef.current) return;

    const activeCampaigns = campaignsRef.current.filter(c => c.status === 'active');
    if (activeCampaigns.length === 0) {
      engineTimerRef.current = setTimeout(runTrafficEngine, 2000);
      return;
    }

    const job = activeCampaigns[Math.floor(Math.random() * activeCampaigns.length)];
    const url = job.urls[Math.floor(Math.random() * job.urls.length)];
    const countryCode = COUNTRY_CODES[job.targeting.region]?.[Math.floor(Math.random() * COUNTRY_CODES[job.targeting.region].length)] || 'US';

    setCurrentJob({
      status: 'SENDING',
      campaign: job.name,
      url: url,
      flag: countryCode
    });

    setCampaigns(prev => prev.map(c =>
      c.id === job.id ? { ...c, stats: { hits: (c.stats?.hits || 0) + 1 } } : c
    ));

    const logEntry: LogEntry = {
      id: 'log-' + Date.now(),
      message: `HIT: ${new URL(url).hostname} [${job.trafficType}] GEO:${countryCode} | GA4: ${job.ga4Id || 'N/A'} | WAF: ${wafMode}`,
      type: 'work',
      timestamp: new Date()
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 149)]);
    setUserData(prev => ({ ...prev, credits: Math.max(0, prev.credits - 1) }));

    // Generate GA4 event if campaign has GA4 ID
    if (job.ga4Id) {
      const eventNames = ['page_view', 'session_start', 'user_engagement', 'scroll'];
      const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
      const ga4Event: GA4Event = {
        id: 'ga4-' + Date.now(),
        eventName,
        campaignName: job.name,
        timestamp: new Date(),
        params: {
          page_location: url,
          page_title: formatUrlToTitle(url),
          country: countryCode,
          traffic_type: job.trafficType,
          session_id: 'sess_' + Math.random().toString(36).substr(2, 9)
        }
      };
      setGa4Events(prev => [ga4Event, ...prev.slice(0, 99)]);
    }

    // Apply WAF mode delay
    const delay = getWafDelay(wafMode);
    engineTimerRef.current = setTimeout(runTrafficEngine, delay);
  }, [wafMode]);

  useEffect(() => {
    if (isEngineRunning) {
      runTrafficEngine();
    } else {
      if (engineTimerRef.current) clearTimeout(engineTimerRef.current);
      setCurrentJob(null);
    }
    return () => { if (engineTimerRef.current) clearTimeout(engineTimerRef.current); };
  }, [isEngineRunning, runTrafficEngine]);

  // Action handlers
  const toggleCampaignStatus = useCallback((campaign: Campaign) => {
    setCampaigns(prev => prev.map(c =>
      c.id === campaign.id
        ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
        : c
    ));
  }, []);

  const handleDeleteCampaign = useCallback((campaignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this campaign? This action cannot be undone.')) {
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    }
  }, []);

  const handleDownloadReport = useCallback((campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const hits = campaign.stats?.hits || 0;
    const content = `
TRAFFIC FLOW - CAMPAIGN PERFORMANCE REPORT
==========================================
CAMPAIGN: ${campaign.name}
STATUS: ${campaign.status.toUpperCase()}
MEASUREMENT ID: ${campaign.ga4Id || 'N/A'}

EXECUTIVE SUMMARY
-----------------
Total Traffic Sent: ${hits.toLocaleString()}
Avg. Session Duration: 50 seconds
Pages per Session: 9
Bounce Rate: 35%

TARGETING
---------
Region: ${campaign.targeting.region}
Country: ${campaign.targeting.countryCode}
Traffic Source: ${campaign.trafficType}

LANDING PAGES
-------------
${campaign.urls.map((url, i) => `${i + 1}. ${formatUrlToTitle(url)}`).join('\n')}

TECHNICAL DETAILS
-----------------
${campaign.ecommerceMode ? '✓ E-commerce Mode (Purchase Events)' : ''}
${campaign.useProxies ? '✓ Proxy Rotation Enabled' : ''}
${campaign.businessHoursOnly ? '✓ Business Hours Only' : ''}
${campaign.returnRate ? '✓ 30% Return Visitor Simulation' : ''}

==========================================
Report generated on ${new Date().toLocaleString()}
`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TrafficFlow_Report_${campaign.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleSaveCampaign = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const countryCode = formData.get('country') as string;
        const trafficPattern = (formData.get('trafficPattern') as string) || 'Linear';

    const newCampaign: Campaign = {
      id: editingCampaign ? editingCampaign.id : 'camp-' + Date.now(),
      name: (formData.get('name') as string).trim(),
      trafficType: formData.get('trafficType') as string,
      urls: (formData.get('urls') as string).split('\n').filter(url => url.trim()),
      targeting: {
        region: formData.get('region') as string,
        countryCode: countryCode
      },
      ga4Id: (formData.get('ga4Id') as string).trim() || null,
      status: editingCampaign ? editingCampaign.status : 'paused',
      stats: editingCampaign ? editingCampaign.stats : { hits: 0 },
      ecommerceMode: formData.get('ecommerceMode') === 'on',
      useProxies: formData.get('useProxies') === 'on',
      businessHoursOnly: formData.get('businessHoursOnly') === 'on',
      returnRate: formData.get('returnRate') === 'on',
      minTime: parseInt(formData.get('minTime') as string) || 40,
      conversionRate: parseInt(formData.get('conversionRate') as string) || 5,
      bounceRate: parseInt(formData.get('bounceRate') as string) || 40,
      dailyBudget: parseInt(formData.get('dailyBudget') as string) || 1000,
            trafficPattern: trafficPattern,
      targetOS: (formData.get('targetOS') as string) || 'Random OS',
      primaryKeywords: (formData.get('primaryKeywords') as string).split('\n').filter(k => k.trim()),
      pasfKeywords: (formData.get('pasfKeywords') as string).split('\n').filter(k => k.trim())
    };

    if (!newCampaign.name) {
      alert('Campaign name is required');
      return;
    }
    if (newCampaign.urls.length === 0) {
      alert('At least one URL is required');
      return;
    }

    if (editingCampaign) {
      setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? newCampaign : c));
    } else {
      setCampaigns(prev => [...prev, newCampaign]);
    }

    setShowNewCampaignModal(false);
    setShowEditCampaignModal(false);
    setEditingCampaign(null);
    setSelectedRegion("Europe");
  }, [editingCampaign]);

  const handleExportCampaigns = useCallback(() => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(campaigns));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `trafficflow_campaigns_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [campaigns]);

  const handleImportCampaigns = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (Array.isArray(data)) {
          setCampaigns(data);
        } else {
          alert('Invalid campaign data format. Please select a valid backup file.');
        }
      } catch (err) {
        alert('Error parsing campaign data: ' + (err as Error).message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  }, []);

  const scrapeProxiesFromUrl = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setScrapping(true);

    setTimeout(() => {
      const newProxies = Array.from({ length: 50 }, (_, i) => ({
        id: `proxy-${Date.now()}-${i}`,
        address: `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}:${Math.floor(Math.random() * 9000) + 1000}`,
        source: 'Scrape',
        addedAt: new Date()
      }));

      setProxies(prev => [...prev, ...newProxies]);
      setScrapping(false);
    }, 1500);
  }, []);

  const deleteAllProxies = useCallback(() => {
    if (window.confirm('Delete all proxies? This action cannot be undone.')) {
      setProxies([]);
    }
  }, []);

  const handleEditCampaign = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowEditCampaignModal(true);
    setSelectedRegion(campaign.targeting.region);
  }, []);

  const closeModal = useCallback(() => {
    setShowNewCampaignModal(false);
    setShowEditCampaignModal(false);
    setEditingCampaign(null);
    setSelectedRegion("Europe");
  }, []);

  // Enterprise tab handlers
  const handleCheckReferrer = useCallback(() => {
    if (!referrerUrl.trim()) {
      alert('Please enter a referrer URL');
      return;
    }
    setReferrerStatus('checking');
    // Simulate referrer check
    setTimeout(() => {
      const isValid = referrerUrl.startsWith('http') && referrerUrl.includes('.');
      setReferrerStatus(isValid ? 'valid' : 'invalid');
      const logEntry: LogEntry = {
        id: 'log-' + Date.now(),
        message: `Referrer check: ${referrerUrl} - ${isValid ? 'VALID' : 'INVALID'}`,
        type: isValid ? 'work' : 'error',
        timestamp: new Date()
      };
      setLogs(prev => [logEntry, ...prev.slice(0, 149)]);
    }, 1500);
  }, [referrerUrl]);

  const getWafDescription = (mode: WAFMode): string => {
    switch (mode) {
      case 'Standard':
        return 'Standard Mode: Basic request spacing with minimal jitter. Suitable for low-security sites.';
      case 'Stealth':
        return 'Stealth Mode: Moderate latency variation with randomized headers. Good for medium-security sites.';
      case 'Ghost':
        return 'Ghost Mode: Maximum latency variation & human-like jitter. Best for high-security sites.';
      default:
        return '';
    }
  };

  const getWafDelay = (mode: WAFMode): number => {
    switch (mode) {
      case 'Standard':
        return 1500;
      case 'Stealth':
        return 2000 + Math.random() * 1000;
      case 'Ghost':
        return 2500 + Math.random() * 2000;
      default:
        return 1500;
    }
  };

  // Icons
  const dashboardIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );

  const campaignsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );

  const proxiesIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="8" rx="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );

  const enterpriseIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );

  const logsIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );

  const showModal = showNewCampaignModal || showEditCampaignModal;

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-slate-900 font-sans text-sm overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shadow-xl">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white">TrafficFlow</h1>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">v15 LIVE</span>
            </div>
          </div>
          <nav>
            <SidebarNavItem tab="dashboard" activeTab={activeTab} onClick={() => setActiveTab('dashboard')} icon={dashboardIcon} />
            <SidebarNavItem tab="campaigns" activeTab={activeTab} onClick={() => setActiveTab('campaigns')} icon={campaignsIcon} badge={activeCampaignsCount} />
            <SidebarNavItem tab="proxies" activeTab={activeTab} onClick={() => setActiveTab('proxies')} icon={proxiesIcon} />
            <SidebarNavItem tab="enterprise" activeTab={activeTab} onClick={() => setActiveTab('enterprise')} icon={enterpriseIcon} />
            <SidebarNavItem tab="logs" activeTab={activeTab} onClick={() => setActiveTab('logs')} icon={logsIcon} />
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800">
          <div className={`p-4 rounded-xl mb-4 border transition-all ${
            isEngineRunning
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
              : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
          }`}>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <span className={`w-2 h-2 rounded-full ${
                  isEngineRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}></span>
                {isEngineRunning ? 'ENGINE: ONLINE' : 'ENGINE: PAUSED'}
              </span>
            </div>
            <button
              onClick={() => setIsEngineRunning(!isEngineRunning)}
              className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${
                isEngineRunning
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-sm hover:bg-slate-100'
              }`}
            >
              {isEngineRunning ? 'STOP ENGINE' : 'START ENGINE'}
            </button>
          </div>
          <button
            onClick={() => alert('Signed out successfully!')}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-medium transition-colors w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="px-8 py-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Command Center</h2>
            <p className="text-slate-500 text-xs">Global Network Monitoring</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowNewCampaignModal(true); setSelectedRegion("Europe"); }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Campaign
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="TOTAL HITS DELIVERED"
                  value={totalHits.toLocaleString()}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  }
                  color="text-blue-500"
                  subtext="All Campaigns"
                  trend="+12% Last 24h"
                />
                <StatCard
                  title="ACTIVE NODES"
                  value="160"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <line x1="6" y1="6" x2="6.01" y2="6" />
                      <line x1="6" y1="18" x2="6.01" y2="18" />
                    </svg>
                  }
                  color="text-emerald-500"
                  subtext="Stable Global Mesh"
                  trend="Optimal"
                />
                <StatCard
                  title="CONVERSION RATE"
                  value="4.2%"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M8 12v-1a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v1" />
                      <circle cx="12" cy="12" r="1" />
                    </svg>
                  }
                  color="text-amber-500"
                  subtext="Key Events Triggered"
                />
                <StatCard
                  title="NETWORK HEALTH"
                  value="98%"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                  }
                  color="text-purple-500"
                  subtext="Low Latency"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 h-[400px] relative overflow-hidden shadow-sm">
                  <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-cover bg-center"></div>
                  <div className="relative z-10 flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      LIVE GEO-TARGETING
                    </h3>
                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-bold animate-pulse">ACTIVE ZONES</span>
                  </div>
                  <div className="relative w-full h-full z-10">
                    {activeCampaignsCount > 0 ? (
                      <>
                        <div className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" style={{ top: '35%', left: '20%' }}></div>
                        <div className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" style={{ top: '28%', left: '52%' }}></div>
                        <div className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" style={{ top: '45%', left: '68%' }}></div>
                        <div className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" style={{ top: '70%', left: '30%' }}></div>
                        <div className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900 animate-ping" style={{ top: '35%', left: '88%' }}></div>
                      </>
                    ) : (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400 text-center">
                        <div className="text-2xl mb-2">🌍</div>
                        <p className="text-sm font-medium">No active campaigns</p>
                        <p className="text-xs">Start engine to see live traffic</p>
                      </div>
                    )}

                    {currentJob && (
                      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span>Sending traffic to: {formatUrlToTitle(currentJob.url)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 h-[400px] shadow-sm">
                  <h3 className="text-sm font-bold uppercase text-slate-500 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    TRAFFIC SOURCES
                  </h3>
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie
                        data={TRAFFIC_SOURCES_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {TRAFFIC_SOURCES_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* CAMPAIGNS TAB */}
          {activeTab === 'campaigns' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 className="font-bold text-lg text-slate-700 dark:text-white">Active Campaigns</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCampaigns}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Backup
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:bg-slate-100 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 8 12 3 17 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Restore
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportCampaigns}
                    className="hidden"
                    accept=".json"
                  />
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-6 py-4">NAME / URL</th>
                    <th className="px-6 py-4">STATUS</th>
                    <th className="px-6 py-4">CONFIG</th>
                    <th className="px-6 py-4 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {campaigns.map(campaign => (
                    <CampaignRow
                      key={campaign.id}
                      campaign={campaign}
                      onToggle={toggleCampaignStatus}
                      onEdit={handleEditCampaign}
                      onDelete={handleDeleteCampaign}
                      onDownload={handleDownloadReport}
                    />
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-400">
                        No campaigns created. Click &quot;New Campaign&quot; to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PROXIES TAB */}
          {activeTab === 'proxies' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl relative overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Infrastructure Collector
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                        Import or scrape fresh proxy nodes to anonymize traffic.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-white/50 dark:bg-black/20 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      Node Status: Online
                    </span>
                  </div>
                  <form onSubmit={scrapeProxiesFromUrl} className="flex gap-4">
                    <input
                      defaultValue="https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000"
                      className="flex-1 p-3 rounded-xl text-xs font-mono text-slate-600 outline-none border border-slate-300 shadow-sm bg-white dark:bg-slate-700"
                    />
                    <button
                      type="submit"
                      disabled={scrapping}
                      className="bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-900 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {scrapping ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                          <path d="M21 12a9 9 0 1 1-9-9" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      )}
                      {scrapping ? 'Scraping...' : 'Start Scraper'}
                    </button>
                  </form>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  Proxy List ({proxies.length})
                </h3>
                <button
                  onClick={deleteAllProxies}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600 transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {proxies.map(proxy => (
                  <div
                    key={proxy.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center group shadow-sm"
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {proxy.address}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">
                        {proxy.source}
                      </div>
                    </div>
                    <button
                      onClick={() => setProxies(prev => prev.filter(p => p.id !== proxy.id))}
                      className="text-slate-300 hover:text-rose-500 p-1"
                      title="Delete proxy"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
                {proxies.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <div className="text-4xl mb-4">🔍</div>
                    <p className="text-lg font-medium mb-2">No proxies found</p>
                    <p className="text-sm">Click &quot;Start Scraper&quot; to collect proxy nodes</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ENTERPRISE TAB */}
          {activeTab === 'enterprise' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-3xl font-bold mb-1">Command Center</h2>
                <p className="text-slate-500">Global Network Monitoring</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-8 rounded-3xl">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-amber-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                    Security & Compliance Shield
                  </h3>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* WAF Evasion Level */}
                  <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-3">WAF Evasion Level</h4>
                    <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                      {(['Standard', 'Stealth', 'Ghost'] as WAFMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setWafMode(mode)}
                          className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
                            mode === wafMode
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                      {getWafDescription(wafMode)}
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-slate-500">Current Delay:</span>
                        <span className="font-mono font-bold text-blue-600">
                          {wafMode === 'Standard' ? '~1.5s' : wafMode === 'Stealth' ? '~2-3s' : '~2.5-4.5s'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Network */}
                  <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-3">Partner Network (Real Traffic)</h4>
                    <div className="bg-black text-emerald-400 p-3 rounded-lg font-mono text-[10px] overflow-hidden truncate mb-3">
                      &lt;script src=&quot;https://tf.app/p.js&quot;&gt;&lt;/script&gt;
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Embed this tag on your landing pages to generate credits from real visitors.
                    </p>
                  </div>

                  {/* Referrer Validator */}
                  <div className="bg-white/60 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
                    <h4 className="font-bold text-xs uppercase text-slate-500 mb-3">Referrer Validator</h4>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={referrerUrl}
                        onChange={(e) => { setReferrerUrl(e.target.value); setReferrerStatus('idle'); }}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://referrer-site.com"
                      />
                      <button 
                        onClick={handleCheckReferrer}
                        disabled={referrerStatus === 'checking'}
                        className="bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {referrerStatus === 'checking' ? '...' : 'Check'}
                      </button>
                    </div>
                    {referrerStatus === 'valid' && (
                      <div className="flex items-center gap-2 text-[10px] text-emerald-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        <span>Valid referrer - Backlink confirmed</span>
                      </div>
                    )}
                    {referrerStatus === 'invalid' && (
                      <div className="flex items-center gap-2 text-[10px] text-rose-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>Invalid referrer - URL not accessible</span>
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Verify active backlinks before using &quot;Referral&quot; mode.
                    </p>
                  </div>
                </div>
              </div>

              {/* GA4 Events Panel */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    Google Analytics 4 - Live Events
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                      {ga4Events.length} Events
                    </span>
                    <button 
                      onClick={() => setGa4Events([])}
                      className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 max-h-[300px] overflow-y-auto">
                  {ga4Events.length > 0 ? (
                    <div className="space-y-2">
                      {ga4Events.map((event) => (
                        <div key={event.id} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-600">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-xs text-slate-800 dark:text-white">{event.eventName}</span>
                              <span className="text-[10px] text-slate-400">{event.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mb-1">Campaign: {event.campaignName}</div>
                            <div className="font-mono text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg overflow-x-auto">
                              {JSON.stringify(event.params)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <div className="text-3xl mb-2">📊</div>
                      <p className="text-sm font-medium mb-1">No GA4 events yet</p>
                      <p className="text-xs">Start the engine with campaigns that have GA4 IDs to see events</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[500px] overflow-y-auto animate-fade-in">
              <div className="font-mono text-xs text-slate-600 dark:text-slate-400">
                {logs.map(log => (
                  <div
                    key={log.id}
                    className="mb-2 pb-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span className="text-slate-400 mr-2">
                      [{log.timestamp.toLocaleTimeString()}]
                    </span>
                    <span className={`${log.type === 'error' ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-center text-slate-400 py-8">
                    <div className="text-3xl mb-2">📝</div>
                    <p>No logs yet. Start the engine to see traffic activity.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-3xl shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingCampaign ? 'Edit Campaign Strategy' : 'Create New Campaign'}
              </h3>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-8 space-y-10">
              {/* Core Identity */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
                  1. Core Identity
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Campaign Name *
                    </label>
                    <input
                      name="name"
                      defaultValue={editingCampaign?.name || ''}
                      required
                      className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Premium SEO Boost"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Traffic Source
                    </label>
                    <select
                      name="trafficType"
                      defaultValue={editingCampaign?.trafficType || 'Organic Search (Google/Bing)'}
                      className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none cursor-pointer"
                    >
                      {TRAFFIC_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Target URLs (One per line) *
                  </label>
                  <textarea
                    name="urls"
                    defaultValue={editingCampaign?.urls?.join('\n') || ''}
                    rows={4}
                    required
                    className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/landing&#10;https://example.com/products"
                  />
                </div>
              </section>

              {/* Advanced SEO & Targeting */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
                  2. Advanced SEO & Targeting
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Geo Region
                    </label>
                    <select
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      name="region"
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none"
                    >
                      {REGIONS.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Specific Country
                    </label>
                    <select
                      name="country"
                      defaultValue={editingCampaign?.targeting?.countryCode || 'US'}
                      className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none"
                    >
                      {COUNTRY_CODES[selectedRegion]?.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <label className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    GA4 Measurement ID (Optional but Recommended)
                  </label>
                  <input
                    name="ga4Id"
                    defaultValue={editingCampaign?.ga4Id || ''}
                    className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 font-mono outline-none"
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>

                {/* Primary Keywords & PASF Keywords */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Primary Keywords
                    </label>
                    <textarea
                      name="primaryKeywords"
                      defaultValue={editingCampaign?.primaryKeywords?.join('\n') || ''}
                      rows={5}
                      className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Formation d'hôtesse de l'air et steward à Rabat, Maroc&#10;École d'aviation au Maroc&#10;Métiers de l'aérien"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      PASF Keywords
                    </label>
                    <textarea
                      name="pasfKeywords"
                      defaultValue={editingCampaign?.pasfKeywords?.join('\n') || ''}
                      rows={5}
                      className="w-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Comment être hôtesse de l'air au Maroc?&#10;Où sont les écoles pour devenir hôtesse de l'air ?&#10;Salaire d'une hôtesse de l'air au Maroc ?"
                    />
                  </div>
                </div>
              </section>

              {/* Behavior & Limits */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">
                  3. Behavior & Limits
                </h4>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-900/50 p-6 rounded-2xl mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">
                      Traffic Pattern
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="ecommerceMode"
                        defaultChecked={editingCampaign?.ecommerceMode || false}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="M8 12v-1a4 4 0 0 1 4-4v0a4 4 0 0 1 4 4v1" />
                          <circle cx="12" cy="12" r="1" />
                        </svg>
                        E-commerce Mode
                      </label>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-8">
                    {['Linear', 'Viral', 'Pulse'].map(pattern => (
                      <label key={pattern} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="radio"
                          name="trafficPattern"
                          value={pattern}
                          defaultChecked={editingCampaign?.trafficPattern === pattern || (!editingCampaign?.trafficPattern && pattern === 'Linear')}
                          className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                        />
                        {pattern}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Min Duration (sec)
                    </label>
                    <input
                      name="minTime"
                      defaultValue={editingCampaign?.minTime || 40}
                      type="number"
                      min="10"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Conversion Rate %
                    </label>
                    <input
                      name="conversionRate"
                      defaultValue={editingCampaign?.conversionRate || 5}
                      type="number"
                      min="1"
                      max="100"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Bounce Rate %
                    </label>
                    <input
                      name="bounceRate"
                      defaultValue={editingCampaign?.bounceRate || 40}
                      type="number"
                      min="1"
                      max="100"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">
                      Daily Hits Cap
                    </label>
                    <input
                      name="dailyBudget"
                      defaultValue={editingCampaign?.dailyBudget || 1000}
                      type="number"
                      min="100"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-6">
                    <label className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        name="useProxies"
                        defaultChecked={editingCampaign?.useProxies !== false}
                        className="rounded text-blue-600"
                      />
                      Proxy Infra
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase cursor-pointer">
                      <input
                        type="checkbox"
                        name="businessHoursOnly"
                        defaultChecked={editingCampaign?.businessHoursOnly !== false}
                        className="rounded text-blue-600"
                      />
                      Business Hrs
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-700 uppercase cursor-pointer col-span-1">
                      <input
                        type="checkbox"
                        name="returnRate"
                        defaultChecked={editingCampaign?.returnRate !== false}
                        className="rounded text-emerald-600"
                      />
                      Returning 30%
                    </label>
                    <select
                      name="targetOS"
                      defaultValue={editingCampaign?.targetOS || 'Random OS'}
                      className="bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 outline-none p-2"
                    >
                      <option>Random OS</option>
                      <option>Windows</option>
                      <option>MacOS</option>
                      <option>iOS</option>
                      <option>Android</option>
                    </select>
                  </div>
                </div>
              </section>

              <div className="flex justify-end gap-4 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
                >
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
