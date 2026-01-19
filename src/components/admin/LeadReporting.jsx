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
          <h4 className="font-bold text-white">{lead.formData?.email || 'Anonymous'}</h4>
          <p className="text-xs text-gray-400">{new Date(lead.timestamp).toLocaleDateString()}</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${lead.isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {lead.isWin ? 'WON' : 'LOST'}
        </span>
      </div>
      <div className="text-sm text-gray-300 mb-2">
        <span className="text-gray-500">Prize:</span> {lead.outcome}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <span className="text-xs text-gray-500">{games.find(g => g.id === lead.gameId)?.name}</span>
        <SafeIcon icon={lead.deviceType === 'mobile' ? FiSmartphone : FiMonitor} className="w-3 h-3 text-gray-600" />
      </div>
    </GlassCard>
  );

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <GlassCard className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center w-full md:w-auto space-x-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
          >
            <SafeIcon icon={FiFilter} className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <span className="text-sm text-gray-400">{filteredLeads.length} Records</span>
        </div>
        
        <button className="w-full md:w-auto bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 text-sm transition-all">
          <SafeIcon icon={FiDownload} className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </GlassCard>

      {/* Mobile Filters Drawer (Inline for now) */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-down mb-6">
          <select 
            value={filters.gameId} 
            onChange={(e) => setFilters({...filters, gameId: e.target.value})}
            className="bg-charcoal-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none"
          >
            <option value="">All Campaigns</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="bg-charcoal-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none" 
          />
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="bg-charcoal-800 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none" 
          />
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Contact</th>
              <th className="p-4 font-medium">Campaign</th>
              <th className="p-4 font-medium">Outcome</th>
              <th className="p-4 font-medium text-right">Device</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-sm text-gray-300">
            {filteredLeads.map(lead => (
              <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">{new Date(lead.timestamp).toLocaleDateString()}</td>
                <td className="p-4">
                  <div className="font-medium text-white">{lead.formData?.email || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{lead.formData?.name}</div>
                </td>
                <td className="p-4">{games.find(g => g.id === lead.gameId)?.name}</td>
                <td className="p-4">
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${lead.isWin ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  {lead.outcome}
                </td>
                <td className="p-4 text-right">
                  <SafeIcon icon={lead.deviceType === 'mobile' ? FiSmartphone : FiMonitor} className="inline w-4 h-4 text-gray-600" />
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