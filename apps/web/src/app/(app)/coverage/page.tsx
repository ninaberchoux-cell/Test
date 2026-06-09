'use client';

import { useState, useEffect } from 'react';
import { delegationApi, aiApi } from '@/lib/api';
import { formatRelativeTime, priorityColors, statusColors, categoryLabels } from '@/lib/utils';
import { CheckCircle, Clock, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

export default function CoveragePage() {
  const [emails, setEmails] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      delegationApi.list({ status: statusFilter || undefined }),
      delegationApi.stats(),
    ]).then(([d, s]) => {
      setEmails(d.emails || []);
      setStats(s);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleComplete = async (id: string) => {
    await delegationApi.complete(id);
    load();
  };

  const handleAccept = async (id: string) => {
    await delegationApi.accept(id);
    load();
  };

  const handleDraft = async (emailId: string) => {
    setDraftLoading(emailId);
    try {
      const res = await aiApi.draft(emailId);
      setDrafts(prev => ({ ...prev, [emailId]: res.draft }));
    } finally {
      setDraftLoading(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Coverage Management</h1>
        <p className="text-gray-500 mt-1">Emails delegated to you while colleagues are on vacation</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Escalated', value: stats.escalated, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Urgent', value: stats.urgent, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {['', 'DELEGATED', 'IN_PROGRESS', 'COMPLETED', 'ESCALATED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Email list */}
      <div className="space-y-3">
        {loading && [...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
        ))}
        {!loading && emails.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No emails to cover right now</p>
          </div>
        )}
        {emails.map((email: any) => (
          <div key={email.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${priorityColors[email.priority]}`}>
                      {email.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[email.status]}`}>
                      {email.status}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {categoryLabels[email.category] || email.category}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 truncate">{email.subject}</p>
                  <p className="text-sm text-gray-400">
                    from {email.fromAddress} · on behalf of {email.recipient?.name} · {formatRelativeTime(email.receivedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {email.status === 'DELEGATED' && (
                    <button onClick={() => handleAccept(email.id)} className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                      Accept
                    </button>
                  )}
                  {email.status === 'IN_PROGRESS' && (
                    <button onClick={() => handleComplete(email.id)} className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Mark done
                    </button>
                  )}
                  <button
                    onClick={() => setExpanded(expanded === email.id ? null : email.id)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {expanded === email.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* AI Summary preview */}
              {email.aiAnalysis?.summary && (
                <p className="text-sm text-gray-500 mt-2 bg-gray-50 rounded-lg px-3 py-2">
                  {email.aiAnalysis.summary}
                </p>
              )}
            </div>

            {/* Expanded panel */}
            {expanded === email.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                {email.aiAnalysis?.actionItems?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Action Items</p>
                    <ul className="space-y-1">
                      {email.aiAnalysis.actionItems.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {email.aiAnalysis?.suggestedResponse && !drafts[email.id] && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Suggested Response</p>
                    <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200">
                      {email.aiAnalysis.suggestedResponse}
                    </p>
                  </div>
                )}

                {drafts[email.id] && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">AI Draft Reply</p>
                    <textarea
                      defaultValue={drafts[email.id]}
                      rows={5}
                      className="w-full text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleDraft(email.id)}
                  disabled={draftLoading === email.id}
                  className="flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {draftLoading === email.id ? 'Generating...' : 'Generate AI Draft'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
