'use client';

import { useState, useEffect } from 'react';
import { vacationApi, aiApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { BrainCircuit, RefreshCw, Mail, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function AISummaryPage() {
  const [vacations, setVacations] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    vacationApi.list().then(d => {
      const v = d.vacations || d;
      setVacations(v);
      if (v.length > 0) setSelected(v[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    aiApi.getSummary(selected)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const handleGenerate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const result = await aiApi.vacationSummary(selected);
      setSummary(result);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const selectedVacation = vacations.find(v => v.id === selected);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Summary Center</h1>
          <p className="text-gray-500 mt-1">AI-generated vacation recap and return briefings</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!selected || generating}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>

      {/* Vacation selector */}
      {vacations.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Vacation Period</label>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            {vacations.map(v => (
              <option key={v.id} value={v.id}>
                {formatDate(v.startDate)} – {formatDate(v.endDate)} ({v.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No vacations */}
      {vacations.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BrainCircuit className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No vacation periods found</p>
          <p className="text-gray-400 text-sm mt-1">Set up a vacation period first</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      )}

      {/* No summary yet */}
      {!loading && selected && !summary && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <BrainCircuit className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No summary generated yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Generate Summary" to create an AI briefing</p>
        </div>
      )}

      {/* Summary */}
      {summary && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-6">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5" />
              <span className="font-semibold">Vacation Summary</span>
            </div>
            {selectedVacation && (
              <p className="text-purple-100 text-sm">
                {formatDate(selectedVacation.startDate)} – {formatDate(selectedVacation.endDate)}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Emails Received', value: summary.totalEmailsReceived, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Emails Handled', value: summary.totalEmailsHandled, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Awaiting Action', value: summary.emailsAwaitingAction, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
              { label: 'Issues Resolved', value: summary.customerIssuesResolved, icon: AlertTriangle, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(stat => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              );
            })}
          </div>

          {/* SLA */}
          {summary.slaComplianceRate != null && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">SLA Compliance</h2>
              <div className="flex items-center gap-4">
                <span className="text-3xl font-bold text-gray-900">{summary.slaComplianceRate.toFixed(0)}%</span>
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${summary.slaComplianceRate}%` }}
                    />
                  </div>
                </div>
                {summary.avgResponseTimeHours && (
                  <span className="text-sm text-gray-500">Avg {summary.avgResponseTimeHours.toFixed(1)}h response</span>
                )}
              </div>
            </div>
          )}

          {/* AI Insights */}
          {summary.aiInsights && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-600" />
                AI Insights
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed">{summary.aiInsights}</p>
            </div>
          )}

          {/* Critical conversations */}
          {summary.criticalConversations?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Critical Conversations</h2>
              <div className="space-y-2">
                {summary.criticalConversations.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.priority === 'URGENT' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                    }`}>{c.priority}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.subject}</p>
                      <p className="text-xs text-gray-500">from {c.from}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-ups */}
          {summary.suggestedFollowUps?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Suggested Follow-ups</h2>
              <ul className="space-y-2">
                {summary.suggestedFollowUps.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="text-purple-500 font-bold mt-0.5">{i + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Generated {new Date(summary.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
