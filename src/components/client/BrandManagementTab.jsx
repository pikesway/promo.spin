import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiTrash2, FiHeart, FiMail, FiAlertTriangle } from 'react-icons/fi';
import BrandFormModal from '../agency/BrandFormModal';

function AllocationBar({ label, allocated, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((allocated / total) * 100)) : 0;
  const isNear = pct >= 80;
  const isAtLimit = pct >= 100;
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
        <span className="text-xs font-medium" style={{ color: isAtLimit ? '#EF4444' : isNear ? '#F59E0B' : 'var(--text-secondary)' }}>
          {allocated.toLocaleString()} / {total.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--glass-bg)' }}>
        <div className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, background: isAtLimit ? '#EF4444' : isNear ? '#F59E0B' : color }} />
      </div>
    </div>
  );
}

export default function BrandManagementTab({ clientId, brands, allocationSummary, usage, onToggleBrand, onDeleteBrand }) {
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [error, setError] = useState('');

  const atBrandLimit = usage && usage.activeBrands >= usage.activeBrandsLimit;

  const handleNew = () => {
    if (atBrandLimit) {
      setError(`You have reached the maximum number of active brands (${usage.activeBrandsLimit}). Deactivate a brand or contact your administrator.`);
      return;
    }
    setError('');
    setEditingBrand(null);
    setShowModal(true);
  };

  const handleEdit = (brand) => {
    setError('');
    setEditingBrand(brand);
    setShowModal(true);
  };

  const handleDelete = async (brand) => {
    if (!confirm(`Delete "${brand.name}" and all its campaigns and members? This cannot be undone.`)) return;
    setError('');
    const { error: e } = await onDeleteBrand(brand.id);
    if (e) setError(e.message || 'Failed to delete brand.');
  };

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
          <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {allocationSummary && (
        <div className="glass-card p-4 mb-5">
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Client Pool Allocation</p>
          <div className="flex gap-6">
            <AllocationBar
              label="Loyalty Members allocated"
              allocated={allocationSummary.allocatedLoyalty}
              total={allocationSummary.loyaltyMembersLimit}
              color="#F59E0B"
            />
            <AllocationBar
              label="Leads allocated"
              allocated={allocationSummary.allocatedLeads}
              total={allocationSummary.leadsLimit}
              color="#3B82F6"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Brands</h3>
          {usage && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {usage.activeBrands} of {usage.activeBrandsLimit} active brands used
            </p>
          )}
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: atBrandLimit ? 'var(--glass-bg)' : 'var(--accent)', color: atBrandLimit ? 'var(--text-tertiary)' : '#fff' }}
        >
          <FiPlus size={13} />
          New Brand
        </button>
      </div>

      {brands.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>No brands yet.</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Create your first brand to start organizing your campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {brands.map(brand => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onEdit={() => handleEdit(brand)}
              onToggle={() => onToggleBrand(brand)}
              onDelete={() => handleDelete(brand)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <BrandFormModal
          brand={editingBrand}
          clientId={clientId}
          allocationSummary={allocationSummary}
          onClose={() => { setShowModal(false); setEditingBrand(null); }}
        />
      )}
    </div>
  );
}

function BrandCard({ brand, onEdit, onToggle, onDelete }) {
  const loyaltyPct = brand.loyalty_members_limit > 0
    ? Math.min(100, Math.round(((brand.enrolled_count || 0) / brand.loyalty_members_limit) * 100))
    : 0;

  return (
    <div className="glass-card p-4" style={{ opacity: brand.active ? 1 : 0.6 }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${brand.primary_color}25`, color: brand.primary_color }}>
            {brand.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
            <span className={`text-xs ${brand.active ? 'text-emerald-400' : 'text-gray-500'}`}>
              {brand.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="flex gap-0.5">
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            title="Edit brand">
            <FiEdit2 size={13} />
          </button>
          <button onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title={brand.active ? 'Deactivate' : 'Activate'}>
            {brand.active
              ? <FiToggleRight size={13} style={{ color: '#10B981' }} />
              : <FiToggleLeft size={13} style={{ color: 'var(--text-tertiary)' }} />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            style={{ color: '#EF4444' }}
            title="Delete brand">
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <FiHeart size={10} /> Loyalty Members
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              — / {brand.loyalty_members_limit?.toLocaleString()}
            </span>
          </div>
          <div className="h-1 rounded-full" style={{ background: 'var(--glass-bg)' }}>
            <div className="h-1 rounded-full" style={{ width: `${loyaltyPct}%`, background: '#F59E0B' }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <FiMail size={10} /> Leads limit
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>{brand.leads_limit?.toLocaleString()}</span>
        </div>
        {brand.unlock_pin && (
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-tertiary)' }}>Unlock PIN</span>
            <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{'•'.repeat(brand.unlock_pin.length)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
