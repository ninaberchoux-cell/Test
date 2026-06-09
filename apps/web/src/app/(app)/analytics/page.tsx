'use client';

import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [responseTime, setResponseTime] = useState<any[]>([]);
  const [volume, setVolume] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sla, setSla] = useState<any>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.overview(),
      analyticsApi.responseTime(days),
      analyticsApi.emailVolume(days),
      analyticsApi.categories(),
      analyticsApi.sla(),
    ]).then(([ov, rt, vol, cat, slaData]) => {
      setOverview(ov);
      setResponseTime(rt);
      setVolume(vol);
      setCategories(cat);
      setSla(slaData);
    }).finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}</div>
        <div className="grid grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 rounded-xl" />)}</div>
      </div>
    );
  }

  const slaRate = sla?.complianceRate?.toFixed(1) ?? '—';

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Coverage performance and email metrics</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                days === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Emails', value: overview?.totalEmails ?? 0 },
          { label: 'Handled Today', value: overview?.handledToday ?? 0 },
          { label: 'Avg Response', value: overview?.avgResponseTimeHours ? `${overview.avgResponseTimeHours.toFixed(1)}h` : '—' },
          { label: 'SLA Compliance', value: `${slaRate}%` },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Email volume */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Email Volume</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volume} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="received" name="Received" fill="#93c5fd" radius={[3, 3, 0, 0]} />
              <Bar dataKey="handled" name="Handled" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response time trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Avg Response Time (hours)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={responseTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="rtGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="avgHours" name="Avg Hours" stroke="#6366f1" fill="url(#rtGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Categories pie */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Email Categories</h2>
          {categories.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={categories} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                  {categories.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SLA breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">SLA Compliance</h2>
          {!sla ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-gray-900">{slaRate}%</span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  parseFloat(slaRate) >= 90 ? 'bg-green-100 text-green-800' :
                  parseFloat(slaRate) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {parseFloat(slaRate) >= 90 ? 'Excellent' : parseFloat(slaRate) >= 70 ? 'Acceptable' : 'Needs improvement'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    parseFloat(slaRate) >= 90 ? 'bg-green-500' :
                    parseFloat(slaRate) >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${slaRate}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Within SLA</p>
                  <p className="text-xl font-bold text-green-700">{sla.withinSla}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">SLA Breached</p>
                  <p className="text-xl font-bold text-red-700">{sla.breached}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
