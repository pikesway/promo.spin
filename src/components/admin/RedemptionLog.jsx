import React, { useState } from 'react';
import { useRedemption } from '../../context/RedemptionContext';
import { useGame } from '../../context/GameContext';
import SafeIcon from '../../common/SafeIcon';
import GlassCard from '../../common/GlassCard';
import * as FiIcons from 'react-icons/fi';

const { FiSearch, FiCheckCircle, FiClock, FiXCircle } = FiIcons;

const RedemptionLog = () => {
  const { redemptions, updateStatus } = useRedemption();
  const { games } = useGame();
  const [search, setSearch] = useState('');

  const filtered = redemptions.filter(r => 
    r.shortCode.toLowerCase().includes(search.toLowerCase()) || 
    r.prizeName.toLowerCase().includes(search.toLowerCase())
  );

  const StatusBadge = ({ status }) => {
    const styles = {
      active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      redeemed: 'bg-green-500/20 text-green-400 border-green-500/30',
      expired: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      voided: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <SafeIcon icon={FiSearch} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          type="text"
          placeholder="Search codes or prizes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-11"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map(item => (
          <GlassCard key={item.id} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${item.status === 'redeemed' ? 'bg-green-500/10 text-green-400' : 'bg-teal-500/10 text-teal-400'}
              `}>
                <span className="font-mono font-bold text-sm">
                  {item.shortCode.substring(0,2)}
                </span>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>{item.shortCode}</h4>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.prizeName}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{games.find(g => g.id === item.gameId)?.name}</p>
              </div>
            </div>

            <div
              className="flex items-center justify-between w-full md:w-auto md:space-x-6 pt-4 md:pt-0"
              style={{ borderTop: '1px solid var(--border-color)', borderTopWidth: 'inherit' }}
            >
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Expires</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : 'Never'}
                </div>
              </div>

              {item.status === 'active' && (
                <button
                  onClick={() => { if(confirm('Void coupon?')) updateStatus(item.id, 'voided'); }}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors"
                >
                  <SafeIcon icon={FiXCircle} className="w-5 h-5" />
                </button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default RedemptionLog;