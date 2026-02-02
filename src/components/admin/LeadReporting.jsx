import React, { useState } from 'react';
import { useLead } from '../../context/LeadContext';
import { useGame } from '../../context/GameContext';
import SafeIcon from '../../common/SafeIcon';
import GlassCard from '../../common/GlassCard';
import * as FiIcons from 'react-icons/fi';

const { FiDownload, FiFilter, FiCalendar, FiSearch, FiSmartphone, FiMonitor } = FiIcons;

const LeadReporting = () => {
  const { games } = useGame();
  const { leads, exportLeads } = useLead();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ gameId: '', startDate: '', endDate: '' });

  const filteredLeads = exportLeads(filters.gameId, filters.startDate, filters.endDate);

  const MobileDataCard = ({ lead }) => (
    <GlassCard className="mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>{lead.formData?.email || 'Anonymous'}</h4>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(lead.timestamp).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lead.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {lead.isWin ? 'WON' : 'LOST'}
        </span>
      </div>
      <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>Prize:</span> {lead.outcome}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{games.find(g => g.id === lead.gameId)?.name}</span>
        <SafeIcon icon={lead.deviceType === 'mobile' ? FiSmartphone : FiMonitor} className="w-3 h-3" style={{ color: 'var(--text-tertiary)' }} />
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      <GlassCard className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center w-full md:w-auto space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: showFilters ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
              color: showFilters ? '#fff' : 'var(--text-secondary)'
            }}
          >
            <SafeIcon icon={FiFilter} className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <div className="h-6 w-px mx-2" style={{ background: 'var(--border-color)' }}></div>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{filteredLeads.length} Records</span>
        </div>

        <button className="w-full md:w-auto bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 text-sm transition-all">
          <SafeIcon icon={FiDownload} className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </GlassCard>

      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-down mb-6">
          <select
            value={filters.gameId}
            onChange={(e) => setFilters({...filters, gameId: e.target.value})}
            className="input"
          >
            <option value="">All Campaigns</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="input"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="input"
          />
        </div>
      )}

      <div className="hidden md:block overflow-hidden rounded-2xl" style={{ border: '1px solid var(--border-color)' }}>
        <table className="w-full text-left border-collapse">
          <thead style={{ background: 'var(--bg-tertiary)' }}>
            <tr>
              <th className="p-4 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Date</th>
              <th className="p-4 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Contact</th>
              <th className="p-4 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Campaign</th>
              <th className="p-4 font-medium text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Outcome</th>
              <th className="p-4 font-medium text-xs uppercase tracking-wider text-right" style={{ color: 'var(--text-secondary)' }}>Device</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {filteredLeads.map(lead => (
              <tr key={lead.id} className="transition-colors" style={{ borderTop: '1px solid var(--border-color)' }}>
                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{new Date(lead.timestamp).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.formData?.email || 'N/A'}</div>
                  <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{lead.formData?.name}</div>
                </td>
                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>{games.find(g => g.id === lead.gameId)?.name}</td>
                <td className="p-4" style={{ color: 'var(--text-secondary)' }}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${lead.isWin ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {lead.outcome}
                </td>
                <td className="p-4 text-right">
                  <SafeIcon icon={lead.deviceType === 'mobile' ? FiSmartphone : FiMonitor} className="inline w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Data Cards */}
      <div className="md:hidden">
        {filteredLeads.map(lead => <MobileDataCard key={lead.id} lead={lead} />)}
      </div>
    </div>
  );
};

export default LeadReporting;