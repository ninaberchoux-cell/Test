'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { vacationApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { CalendarOff, Plus, Trash2, Play } from 'lucide-react';

const vacationSchema = z.object({
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  colleagueEmail: z.string().email('Valid email required'),
  reminderHours: z.number().min(1).max(72).default(4),
  secondReminderHours: z.number().min(1).max(168).default(8),
  escalationHours: z.number().min(1).max(336).default(24),
  oooMessage: z.string().optional(),
});

type VacationForm = z.infer<typeof vacationSchema>;

export default function VacationPage() {
  const [vacations, setVacations] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<VacationForm>({
    resolver: zodResolver(vacationSchema),
    defaultValues: { reminderHours: 4, secondReminderHours: 8, escalationHours: 24 },
  });

  const load = () => {
    setLoading(true);
    vacationApi.list().then(d => setVacations(d.vacations || d)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: VacationForm) => {
    setSaving(true);
    try {
      await vacationApi.create(data);
      reset();
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to create vacation');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivating(id);
    try {
      await vacationApi.activate(id);
      load();
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vacation period?')) return;
    await vacationApi.delete(id);
    load();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vacation Settings</h1>
          <p className="text-gray-500 mt-1">Configure your vacation periods and email delegation</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Vacation
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-5">New Vacation Period</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" {...register('startDate')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" {...register('endDate')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Backup Colleague Email</label>
              <input type="email" {...register('colleagueEmail')} placeholder="colleague@company.com" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.colleagueEmail && <p className="text-red-500 text-xs mt-1">{errors.colleagueEmail.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1st Reminder (hours)</label>
                <input type="number" {...register('reminderHours', { valueAsNumber: true })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2nd Reminder (hours)</label>
                <input type="number" {...register('secondReminderHours', { valueAsNumber: true })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escalation (hours)</label>
                <input type="number" {...register('escalationHours', { valueAsNumber: true })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Out-of-Office Message (optional)</label>
              <textarea {...register('oooMessage')} rows={3} placeholder="I'm on vacation from... Emails are being handled by..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors">
                {saving ? 'Saving...' : 'Create Vacation Period'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg text-sm border border-gray-200 hover:border-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vacation list */}
      <div className="space-y-4">
        {loading && <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>}
        {!loading && vacations.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <CalendarOff className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No vacation periods set up yet</p>
            <p className="text-gray-400 text-sm mt-1">Click "New Vacation" to get started</p>
          </div>
        )}
        {vacations.map((v: any) => (
          <div key={v.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {formatDate(v.startDate)} – {formatDate(v.endDate)}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    v.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    v.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                    v.status === 'COMPLETED' ? 'bg-gray-100 text-gray-600' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {v.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  <p>Backup: <span className="text-gray-700">{v.colleague?.name || v.colleague?.email || '—'}</span></p>
                  <p>Reminders: <span className="text-gray-700">{v.reminderHours}h → {v.secondReminderHours}h → escalate at {v.escalationHours}h</span></p>
                  {v.oooMessage && <p className="italic truncate max-w-md">"{v.oooMessage}"</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {v.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleActivate(v.id)}
                    disabled={activating === v.id}
                    className="flex items-center gap-1.5 text-green-700 bg-green-50 hover:bg-green-100 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {activating === v.id ? 'Activating...' : 'Activate'}
                  </button>
                )}
                <button
                  onClick={() => handleDelete(v.id)}
                  className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
