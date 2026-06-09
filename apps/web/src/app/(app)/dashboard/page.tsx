'use client';

import { useEffect, useState } from 'react';
import { analyticsApi, vacationApi, delegationApi } from '@/lib/api';
import { formatRelativeTime, priorityColors, statusColors } from '@/lib/utils';
import { Mail, Clock, CheckCircle, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [vacations, setVacations] = useState<any[]>([]);
  const [delegations, setDelegations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.overview(),
      vacationApi.list(),
      delegationApi.list({ limit: 5 }),
    ]).then(([ov, vac, del]) => {
      setOverview(ov);
      setVacations(vac.vacations || vac);
      setDelegations(del.emails || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Pending Delegations', value: overview?.pendingDelegations ?? 0, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Handled Today', value: overview?.handledToday ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Urgent Emails', value: overview?.urgentPending ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Avg Response', value: overview?.avgResponseTimeHours ? `${overview.avgResponseTimeHours.toFixed(1)}h` : '—', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const activeVacation = vacations.find(v => v.status === 'ACTIVE');

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Your vacation coverage overview</p>
        </div>
        <Link
          href="/vacation"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Set up vacation
        </Link>
      </div>

      {/* Active vacation banner */}
      {activeVacation && (
        <div className="bg-blue-600 text-white rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-semibold">Vacation mode is active</p>
              <p className="text-blue-100 text-sm">
                Emails are being delegated to your backup colleague
              </p>
            </div>
          </div>
          <Link href="/vacation" className="bg-white/20 hover:bg-white/30 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            Manage
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{s.label}</p>
                <div className={`${s.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Delegated emails */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Recent Delegations</h2>
            <Link href="/coverage" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {delegations.length === 0 && (
              <p className="p-5 text-sm text-gray-400">No delegations yet</p>
            )}
            {delegations.map((email: any) => (
              <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{email.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">from {email.fromAddress}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap ${priorityColors[email.priority]}`}>
                    {email.priority}
                  </span>
                </div>
                {email.aiAnalysis?.summary && (
                  <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{email.aiAnalysis.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[email.status]}`}>
                    {email.status}
                  </span>
                  <span className="text-xs text-gray-400">{formatRelativeTime(email.receivedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vacation periods */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Vacation Periods</h2>
            <Link href="/vacation" className="text-blue-600 text-sm hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {vacations.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-gray-400 text-sm mb-3">No vacation periods yet</p>
                <Link href="/vacation" className="text-blue-600 text-sm font-medium hover:underline">
                  Set up your first vacation →
                </Link>
              </div>
            )}
            {vacations.slice(0, 5).map((v: any) => (
              <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(v.startDate).toLocaleDateString()} – {new Date(v.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Backup: {v.colleague?.name ?? 'Not set'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    v.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {v.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
