import React from 'react';
import { FiEye, FiX, FiChevronRight } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';

export default function ImpersonationBar() {
  const { impersonation, stopImpersonation, clients, brands } = usePlatform();

  if (!impersonation.clientId) return null;

  const client = clients.find(c => c.id === impersonation.clientId);
  const brand = impersonation.brandId ? brands.find(b => b.id === impersonation.brandId) : null;

  return (
    <div
      className="w-full flex items-center justify-between px-4 py-2.5 text-sm"
      style={{ background: '#B45309', color: '#fff' }}
    >
      <div className="flex items-center gap-2">
        <FiEye size={14} />
        <span className="font-medium">Viewing as:</span>
        <span>{client?.name || 'Unknown Client'}</span>
        {brand && (
          <>
            <FiChevronRight size={12} />
            <span>{brand.name}</span>
          </>
        )}
        <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(0,0,0,0.25)' }}>
          Admin View
        </span>
      </div>
      <button
        onClick={stopImpersonation}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
        style={{ background: 'rgba(0,0,0,0.25)' }}
      >
        <FiX size={12} />
        Exit
      </button>
    </div>
  );
}
