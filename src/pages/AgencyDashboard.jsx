import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiTag, FiActivity, FiGift, FiPlus, FiChevronRight, FiSearch, FiEye, FiEdit, FiBarChart2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import { supabase } from '../supabase/client';
import NewClientModal from '../components/agency/NewClientModal';

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function UsageDots({ used, limit }) {
  if (!limit) return null;
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#10B981';
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 w-16 rounded-full" style={{ background: 'var(--glass-bg)' }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{used}/{limit}</span>
    </div>
  );
}

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { clients, brands, campaigns, leads, redemptions, isLoading, startImpersonation, getClientUsage } = usePlatform();
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [search, setSearch] = useState('');
  const [loyaltyMemberCount, setLoyaltyMemberCount] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const [totalRewards, setTotalRewards] = useState(0);
  const [clientUserCounts, setClientUserCounts] = useState({});

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return;
      const [membersResult, visitsResult, rewardsResult, usersResult] = await Promise.allSettled([
        supabase.from('loyalty_accounts').select('*', { count: 'exact', head: true }),
        supabase.from('loyalty_progress_log').select('*', { count: 'exact', head: true }).eq('action_type', 'visit_confirmed'),
        supabase.from('loyalty_redemptions').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('client_id, role').in('role', ['client', 'client_admin', 'staff', 'client_user']).eq('is_active', true),
      ]);
      if (membersResult.status === 'fulfilled') setLoyaltyMemberCount(membersResult.value.count || 0);
      if (visitsResult.status === 'fulfilled') setTotalVisits(visitsResult.value.count || 0);
      if (rewardsResult.status === 'fulfilled') setTotalRewards(rewardsResult.value.count || 0);
      if (usersResult.status === 'fulfilled' && usersResult.value.data) {
        const counts = {};
        usersResult.value.data.forEach(u => {
          if (u.client_id) counts[u.client_id] = (counts[u.client_id] || 0) + 1;
        });
        setClientUserCounts(counts);
      }
    };
    fetchStats();
  }, []);

  const activeClients = clients.filter(c => c.status === 'active').length;
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
  }, [clients, search]);

  const handleViewClient = (clientId) => {
    navigate(`/agency/clients/${clientId}`);
  };

  const handleImpersonate = async (clientId) => {
    await startImpersonation(clientId);
    navigate(`/client/${clientId}`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Agency Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Platform overview and client management</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/agency/users')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              <FiUsers size={14} />
              Users
            </button>
            <button
              onClick={() => navigate('/agency/audit')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
            >
              <FiActivity size={14} />
              Audit Log
            </button>
            <button
              onClick={() => setShowNewClientModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              <FiPlus size={14} />
              New Client
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="Active Clients" value={activeClients} icon={FiUsers} color="#0EA5E9" />
          <StatCard label="Total Brands" value={brands.length} icon={FiTag} color="#8B5CF6" />
          <StatCard label="Active Campaigns" value={activeCampaigns} icon={FiActivity} color="#10B981" />
          <StatCard label="Loyalty Members" value={loyaltyMemberCount} icon={FiUsers} color="#F59E0B" />
          <StatCard label="Rewards Redeemed" value={totalRewards} icon={FiGift} color="#EF4444" />
        </div>

        <div className="glass-card">
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Clients ({clients.length})</h2>
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-9 pr-4 py-2 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '220px' }}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <p style={{ color: 'var(--text-tertiary)' }}>No clients yet.</p>
              <button
                onClick={() => setShowNewClientModal(true)}
                className="mt-3 text-sm font-medium"
                style={{ color: 'var(--accent)' }}
              >
                Create your first client
              </button>
            </div>
          ) : (
            <div>
              {filteredClients.map((client, i) => {
                const clientBrands = brands.filter(b => b.client_id === client.id);
                const activeBrands = clientBrands.filter(b => b.active).length;
                const clientCampaigns = campaigns.filter(c => c.client_id === client.id && c.status === 'active').length;
                const userCount = clientUserCounts[client.id] || 0;

                return (
                  <div
                    key={client.id}
                    className="px-5 py-4 flex items-center gap-4 transition-colors hover:bg-white/5"
                    style={{ borderBottom: i < filteredClients.length - 1 ? '1px solid var(--border-color)' : 'none' }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{ background: `${client.primary_color}20`, color: client.primary_color }}
                    >
                      {client.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          client.status === 'active' ? 'text-green-400' :
                          client.status === 'paused' ? 'text-amber-400' : 'text-gray-400'
                        }`} style={{
                          background: client.status === 'active' ? 'rgba(16,185,129,0.15)' :
                          client.status === 'paused' ? 'rgba(245,158,11,0.15)' : 'rgba(156,163,175,0.15)'
                        }}>
                          {client.status}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>{client.email}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-xs flex-shrink-0">
                      <div className="text-center">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{activeBrands}</p>
                        <p style={{ color: 'var(--text-tertiary)' }}>brands</p>
                        <UsageDots used={activeBrands} limit={client.active_brands_limit} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{clientCampaigns}</p>
                        <p style={{ color: 'var(--text-tertiary)' }}>campaigns</p>
                        <UsageDots used={clientCampaigns} limit={client.active_campaigns_limit} />
                      </div>
                      <div className="text-center">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{userCount}</p>
                        <p style={{ color: 'var(--text-tertiary)' }}>users</p>
                        <UsageDots used={userCount} limit={client.active_users_limit} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleImpersonate(client.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="View as client"
                      >
                        <FiEye size={15} />
                      </button>
                      <button
                        onClick={() => handleViewClient(client.id)}
                        className="p-2 rounded-lg transition-colors hover:bg-white/10"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Client details"
                      >
                        <FiChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showNewClientModal && (
        <NewClientModal
          onClose={() => setShowNewClientModal(false)}
          onCreated={(client) => {
            setShowNewClientModal(false);
          }}
        />
      )}
    </div>
  );
}
