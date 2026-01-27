import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHeart, FiMail, FiUser, FiPhone, FiCheck } from 'react-icons/fi';
import { supabase } from '../supabase/client';

export default function LoyaltyEnrollmentPage() {
  const { campaignSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [client, setClient] = useState(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    consent: false
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const { data: campaignData, error: campaignError } = await supabase
          .from('campaigns')
          .select('*, clients(*)')
          .eq('slug', campaignSlug)
          .eq('type', 'loyalty')
          .maybeSingle();

        if (campaignError) throw campaignError;
        if (!campaignData) {
          setError('Loyalty program not found');
          return;
        }

        setCampaign(campaignData);
        setClient(campaignData.clients);

        const { data: programData } = await supabase
          .from('loyalty_programs')
          .select('*')
          .eq('campaign_id', campaignData.id)
          .maybeSingle();

        setLoyaltyConfig(programData || campaignData.config?.loyalty);
      } catch (err) {
        console.error('Error loading program:', err);
        setError('Failed to load loyalty program');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignSlug]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }
    if (!formData.consent) errors.consent = 'You must agree to the terms';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateMemberCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const { data: existing } = await supabase
        .from('loyalty_accounts')
        .select('member_code')
        .eq('campaign_id', campaign.id)
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (existing) {
        navigate(`/loyalty/${campaignSlug}/${existing.member_code}`);
        return;
      }

      const memberCode = generateMemberCode();

      const { error: insertError } = await supabase
        .from('loyalty_accounts')
        .insert({
          campaign_id: campaign.id,
          client_id: client.id,
          email: formData.email.toLowerCase(),
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          member_code: memberCode,
          current_progress: 0,
          total_visits: 0,
          reward_unlocked: false
        });

      if (insertError) throw insertError;

      navigate(`/loyalty/${campaignSlug}/${memberCode}`);
    } catch (err) {
      console.error('Error enrolling:', err);
      if (err.code === '23505') {
        setFormErrors({ email: 'This email is already enrolled' });
      } else {
        setError('Failed to enroll. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Program not found'}</p>
        </div>
      </div>
    );
  }

  const primaryColor = client?.primary_color || '#F59E0B';
  const backgroundColor = client?.background_color || '#18181B';
  const threshold = loyaltyConfig?.threshold || campaign?.config?.loyalty?.threshold || 10;
  const rewardName = loyaltyConfig?.reward_name || loyaltyConfig?.rewardName || campaign?.config?.loyalty?.rewardName || 'Free Reward';

  const isLightBackground = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const isDark = !isLightBackground(backgroundColor);
  const textColor = isDark ? 'text-white' : 'text-gray-900';
  const mutedTextColor = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputBg = isDark ? 'bg-white/5' : 'bg-black/5';
  const inputBorder = isDark ? 'border-white/10' : 'border-gray-300';
  const inputFocusBorder = isDark ? 'focus:border-white/30' : 'focus:border-gray-400';
  const inputText = isDark ? 'text-white' : 'text-gray-900';
  const inputPlaceholder = isDark ? 'placeholder-gray-500' : 'placeholder-gray-400';
  const hoverBg = isDark ? 'hover:bg-white/5' : 'hover:bg-black/5';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center py-8 px-4"
      style={{ background: backgroundColor }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {client?.logo_url && (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-16 mx-auto mb-4 object-contain"
            />
          )}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <FiHeart size={32} style={{ color: primaryColor }} />
          </div>
          <h1 className={`text-2xl font-bold ${textColor} mb-2`}>
            Join {client?.name || 'Our'} Rewards
          </h1>
          <p className={mutedTextColor}>
            Collect {threshold} stamps and earn <span className={`${textColor} font-medium`}>{rewardName}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm ${mutedTextColor} mb-2`}>Your Name</label>
            <div className="relative">
              <FiUser className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedTextColor}`} />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className={`
                  w-full pl-11 pr-4 py-3 rounded-xl ${inputBg} border ${inputText} ${inputPlaceholder}
                  focus:outline-none transition-colors
                  ${formErrors.name ? 'border-red-500' : `${inputBorder} ${inputFocusBorder}`}
                `}
              />
            </div>
            {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className={`block text-sm ${mutedTextColor} mb-2`}>Email Address</label>
            <div className="relative">
              <FiMail className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedTextColor}`} />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className={`
                  w-full pl-11 pr-4 py-3 rounded-xl ${inputBg} border ${inputText} ${inputPlaceholder}
                  focus:outline-none transition-colors
                  ${formErrors.email ? 'border-red-500' : `${inputBorder} ${inputFocusBorder}`}
                `}
              />
            </div>
            {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
          </div>

          <div>
            <label className={`block text-sm ${mutedTextColor} mb-2`}>Phone (optional)</label>
            <div className="relative">
              <FiPhone className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedTextColor}`} />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
                className={`w-full pl-11 pr-4 py-3 rounded-xl ${inputBg} border ${inputBorder} ${inputFocusBorder} ${inputText} ${inputPlaceholder} focus:outline-none transition-colors`}
              />
            </div>
          </div>

          <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${formErrors.consent ? 'bg-red-500/10' : hoverBg}`}>
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="sr-only"
              />
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${formData.consent
                    ? 'border-transparent'
                    : formErrors.consent ? 'border-red-500' : isDark ? 'border-white/30' : 'border-gray-400'
                  }
                `}
                style={formData.consent ? { backgroundColor: primaryColor } : {}}
              >
                {formData.consent && <FiCheck size={12} className="text-white" />}
              </div>
            </div>
            <span className={`text-sm ${mutedTextColor}`}>
              I agree to receive rewards updates and promotional messages from {client?.name || 'this business'}
            </span>
          </label>
          {formErrors.consent && <p className="text-red-400 text-xs -mt-2">{formErrors.consent}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <FiHeart size={18} />
                Join Rewards Program
              </>
            )}
          </button>
        </form>

        <p className={`text-center ${mutedTextColor} text-xs mt-6`}>
          Already a member? Your card will be retrieved automatically.
        </p>
      </div>
    </div>
  );
}
