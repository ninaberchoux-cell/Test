'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Users, Building2, FileText, Shield } from 'lucide-react';

type Tab = 'users' | 'organizations' | 'audit';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const loadTab = (t: Tab) => {
    setLoading(true);
    const fetchers: Record<Tab, () => Promise<any>> = {
      users: () => adminApi.users().then(setUsers),
      organizations: () => adminApi.organizations().then(setOrgs),
      audit: () => adminApi.auditLogs().then(d => setLogs(d.logs || [])),
    };
    fetchers[t]().finally(() => setLoading(false));
  };

  useEffect(() => { loadTab(tab); }, [tab]);

  const handleRoleChange = async (userId: string, role: string) => {
    setUpdatingRole(userId);
    try {
      await adminApi.updateRole(userId, role);
      loadTab('users');
    } finally {
      setUpdatingRole(null);
    }
  };

  const tabs = [
    { id: 'users' as Tab, label: 'Users', icon: Users },
    { id: 'organizations' as Tab, label: 'Organizations', icon: Building2 },
    { id: 'audit' as Tab, label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        </div>
        <p className="text-gray-500">Manage users, organizations, and system audit logs</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg" />)}
        </div>
      )}

      {/* Users */}
      {!loading && tab === 'users' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Organization</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{u.organization?.name || '—'}</td>
                  <td className="px-5 py-3">
                    <select
                      defaultValue={u.role}
                      disabled={updatingRole === u.id}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {['USER', 'MANAGER', 'ORG_ADMIN'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{formatDateTime(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Organizations */}
      {!loading && tab === 'organizations' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Organization</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Domain</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Users</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Emails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orgs.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{o.name}</td>
                  <td className="px-5 py-3 text-gray-600">{o.domain}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      o.plan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                      o.plan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>{o.plan}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{o._count?.users ?? 0}</td>
                  <td className="px-5 py-3 text-gray-600">{o._count?.emails ?? 0}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No organizations found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit logs */}
      {!loading && tab === 'audit' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Action</th>
                <th className="text-left px-5 py-3 font-medium text-gray-600">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{formatDateTime(log.createdAt)}</td>
                  <td className="px-5 py-3 text-gray-600">{log.user?.name || 'System'}</td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{log.action}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
