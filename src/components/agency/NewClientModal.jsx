import React, { useState } from 'react';
import { FiX, FiArrowRight, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../supabase/client';
import WizardBanner from '../help/WizardBanner';
import FieldHint from '../help/FieldHint';
import InfoButton from '../help/InfoButton';

const STEPS = ['Client Info', 'Usage Limits', 'Admin User', 'First Brand'];

export default function NewClientModal({ onClose, onCreated }) {
  const { createClient, createBrand } = usePlatform();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdClient, setCreatedClient] = useState(null);

  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    primary_color: '#0EA5E9',
    secondary_color: '#0284C7',
    background_color: '#09090B',
    status: 'active',
  });

  const [limitsForm, setLimitsForm] = useState({
    active_brands_limit: 5,
    active_users_limit: 10,
    active_campaigns_limit: 20,
    loyalty_members_limit: 1000,
    leads_limit: 5000,
  });

  const [adminForm, setAdminForm] = useState({
    email: '',
    password: '',
    full_name: '',
  });

  const [brandForm, setBrandForm] = useState({
    name: '',
    primary_color: '#0EA5E9',
    secondary_color: '#0284C7',
    unlock_pin: '',
    loyalty_members_limit: 500,
  });

  const [skipBrand, setSkipBrand] = useState(false);

  const handleClientNext = async () => {
    if (!clientForm.name.trim()) {
      setError('Client name is required.');
      return;
    }
    setError('');
    setStep(1);
  };

  const handleLimitsNext = () => {
    setError('');
    setStep(2);
  };

  const handleAdminNext = async () => {
    if (!adminForm.email.trim() || !adminForm.password.trim()) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: clientData, error: clientError } = await createClient({
        ...clientForm,
        ...limitsForm,
      });

      if (clientError) throw clientError;
      setCreatedClient(clientData);

      const { error: fnError } = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create',
          email: adminForm.email,
          password: adminForm.password,
          fullName: adminForm.full_name,
          role: 'client_admin',
          clientId: clientData.id,
        }
      });

      if (fnError) {
        throw new Error(`Failed to create admin user: ${fnError.message}`);
      }

      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to create client.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (skipBrand) {
      onCreated?.(createdClient);
      onClose();
      return;
    }

    if (!brandForm.name.trim()) {
      setError('Brand name is required, or skip this step.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: brandError } = await createBrand({
        ...brandForm,
        client_id: createdClient.id,
        active: true,
      });

      if (brandError) throw brandError;
      onCreated?.(createdClient);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create brand.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>New Client</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <FiX size={18} />
          </button>
        </div>

        <div className="flex gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all" style={{
              background: i <= step ? 'var(--accent)' : 'var(--glass-bg)'
            }} />
          ))}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <WizardBanner>Enter the basic details for this client. This is the business or account you are setting up — for example, a winery, restaurant, or retail shop.</WizardBanner>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Client Name *</label>
              <input
                type="text"
                value={clientForm.name}
                onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Acme Coffee Co"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <FieldHint>The display name for this client account, visible in your agency dashboard.</FieldHint>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Contact Email</label>
              <input
                type="email"
                value={clientForm.email}
                onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                placeholder="contact@client.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <FieldHint>For your records — not used for login. The admin user email is set in the next step.</FieldHint>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'primary_color', label: 'Primary' },
                { key: 'secondary_color', label: 'Secondary' },
                { key: 'background_color', label: 'Background' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                    <input
                      type="color"
                      value={clientForm[key]}
                      onChange={e => setClientForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{clientForm[key]}</span>
                  </div>
                </div>
              ))}
            </div>
            <FieldHint>Brand colors customize how this client's campaigns and cards appear to customers.</FieldHint>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <WizardBanner>Set the maximum resources this client can use. The client cannot exceed these limits — only a super admin can increase them later.</WizardBanner>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  Active Brands
                  <InfoButton title="Active Brands" content="Controls how many active brands this client can maintain at one time. Inactive (archived) brands do not count toward this limit." />
                </label>
                <input type="number" min="1" value={limitsForm.active_brands_limit}
                  onChange={e => setLimitsForm(p => ({ ...p, active_brands_limit: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  Active Users
                  <InfoButton title="Active Users" content="The maximum number of staff and admin accounts this client can have. Includes client admins and any brand-level users." />
                </label>
                <input type="number" min="1" value={limitsForm.active_users_limit}
                  onChange={e => setLimitsForm(p => ({ ...p, active_users_limit: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  Active Campaigns
                  <InfoButton title="Active Campaigns" content="The total number of live (active) campaigns across all of this client's brands. Draft and completed campaigns do not count." />
                </label>
                <input type="number" min="1" value={limitsForm.active_campaigns_limit}
                  onChange={e => setLimitsForm(p => ({ ...p, active_campaigns_limit: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            <div className="pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Pool limits — shared across all brands. Each brand gets an allocation from these totals.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    Total Loyalty Members
                    <InfoButton title="Total Loyalty Members" content="The combined maximum number of enrolled loyalty members across all of this client's brands. Each brand draws from this shared pool." />
                  </label>
                  <input type="number" min="1" value={limitsForm.loyalty_members_limit}
                    onChange={e => setLimitsForm(p => ({ ...p, loyalty_members_limit: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    Total Leads
                    <InfoButton title="Total Leads" content="The maximum number of leads (game players who submitted their contact info) this client can collect across all brands and campaigns." />
                  </label>
                  <input type="number" min="1" value={limitsForm.leads_limit}
                    onChange={e => setLimitsForm(p => ({ ...p, leads_limit: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <WizardBanner>Create the login account for this client's main administrator. They will use these credentials to log in and manage their campaigns, brands, and users.</WizardBanner>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <input
                type="text"
                value={adminForm.full_name}
                onChange={e => setAdminForm(p => ({ ...p, full_name: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email *</label>
              <input
                type="email"
                value={adminForm.email}
                onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                placeholder="jane@client.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <FieldHint>This will be the login email for the client admin. Share it with them once the account is created.</FieldHint>
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Password *</label>
              <input
                type="password"
                value={adminForm.password}
                onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <FieldHint>The client can update their password from their profile settings after logging in.</FieldHint>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <WizardBanner>A brand represents a location or sub-account — for example, "Downtown Location" or "Main Street Store". Each brand gets its own campaigns and loyalty program. You can add more brands later.</WizardBanner>
            {!skipBrand && (
              <>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Brand Name *</label>
                  <input
                    type="text"
                    value={brandForm.name}
                    onChange={e => setBrandForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Main Street Location"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Primary Color</label>
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                      <input type="color" value={brandForm.primary_color} onChange={e => setBrandForm(p => ({ ...p, primary_color: e.target.value }))} className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{brandForm.primary_color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                      Unlock PIN
                      <InfoButton title="Unlock PIN" content="Staff enter this PIN to add stamps for a customer. Keep it short and memorable — it's used at the point of sale every day." />
                    </label>
                    <input
                      type="text"
                      value={brandForm.unlock_pin}
                      onChange={e => setBrandForm(p => ({ ...p, unlock_pin: e.target.value }))}
                      placeholder="1234"
                      maxLength={8}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    Max Loyalty Members
                    <InfoButton title="Max Loyalty Members" content="The maximum number of customers that can enroll in this brand's loyalty program. This draws from the client's total loyalty member pool." />
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={brandForm.loyalty_members_limit}
                    onChange={e => setBrandForm(p => ({ ...p, loyalty_members_limit: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={skipBrand}
                onChange={e => setSkipBrand(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Skip brand creation for now</span>
            </label>
            {skipBrand && (
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>You can create brands later from the client's dashboard.</p>
            )}
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <FiArrowLeft size={14} />
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 && (
            <button
              onClick={step === 0 ? handleClientNext : step === 1 ? handleLimitsNext : handleAdminNext}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading ? 'Creating...' : 'Next'}
              <FiArrowRight size={14} />
            </button>
          )}

          {step === 3 && (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: '#10B981', color: '#fff' }}
            >
              {loading ? 'Finishing...' : 'Done'}
              <FiCheck size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
