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
    ga4ApiSecret?: string | null;
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
const SEARCH_ENGINES = ['google', 'bing', 'yahoo', 'duckduckgo', 'baidu', 'yandex', 'ecosia'];
const REGIONS = ['Europe', 'North America', 'Asia', 'Africa', 'South America', 'Oceania'];
const COUNTRY_CODES: any = { 'Europe': ['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI'], 'North America': ['US', 'CA', 'MX'], 'Asia': ['JP', 'IN', 'CN', 'KR', 'SG', 'TH', 'VN', 'ID'], 'Africa': ['MA', 'ZA', 'EG', 'NG', 'KE', 'TN', 'DZ', 'ET'], 'South America': ['BR', 'AR', 'CL', 'CO', 'PE'], 'Oceania': ['AU', 'NZ'] };
