import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSearch, FiActivity } from 'react-icons/fi';
import { supabase } from '../supabase/client';
import { usePlatform } from '../context/PlatformContext';

const ACTION_LABELS = {
  impersonation_start: 'Started impersonation',
  impersonation_end: 'Ended impersonation',
  client_updated: 'Updated client',
  brand_created: 'Created brand',
  brand_updated: 'Updated brand',
  campaign_created: 'Created campaign',
  campaign_updated: 'Updated campaign',
};

export default function AuditLogPage() {
  const navigate = useNavigate();
  const { clients } = usePlatform();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_actor_user_id_fkey(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(200);
      setLogs(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = logs.filter(log => {
    const matchesClient = clientFilter === 'all' || log.impersonated_client_id === clientFilter;
    const actor = log.profiles?.email || '';
    const matchesSearch = !search || actor.includes(search.toLowerCase()) || log.action_type.includes(search.toLowerCase());
    return matchesClient && matchesSearch;
  });

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/agency')} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Log</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Admin impersonation and action history</p>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by actor or action..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All clients</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="glass-card">
          {loading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>No audit log entries.</div>
          ) : (
            <div>
              {filtered.map((log, i) => {
                const client = clients.find(c => c.id === log.impersonated_client_id);
                return (
                  <div
                    key={log.id}
                    className="px-5 py-4 flex items-start gap-4"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: 'var(--glass-bg)' }}>
                      <FiActivity size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {ACTION_LABELS[log.action_type] || log.action_type}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        <span>By: {log.profiles?.full_name || log.profiles?.email || 'Unknown'}</span>
                        {client && <span>Client: {client.name}</span>}
                        {log.entity_type && <span>Entity: {log.entity_type}</span>}
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
