import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHeart, FiMail, FiUser, FiPhone, FiCheck, FiSmartphone, FiCalendar } from 'react-icons/fi';
import { supabase } from '../supabase/client';

const DEVICE_TOKEN_EXPIRY_DAYS = 60;

function getDeviceTokenKey(campaignSlug) {
  return `loyalty_device_${campaignSlug}`;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac/i.test(ua)) return 'Mac';
  return 'Browser';
}

export default function LoyaltyEnrollmentPage() {
  const { campaignSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);
  const [client, setClient] = useState(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState(null);
  const [checkingDevice, setCheckingDevice] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthdayMonth: '',
    birthdayDay: '',
    consent: false,
    rememberDevice: true
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const checkDeviceToken = async () => {
      const tokenKey = getDeviceTokenKey(campaignSlug);
      const storedToken = localStorage.getItem(tokenKey);

      if (storedToken) {
        const { data: tokenData } = await supabase
          .from('loyalty_device_tokens')
          .select('loyalty_account_id, expires_at, loyalty_accounts(member_code)')
          .eq('device_token', storedToken)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (tokenData?.loyalty_accounts?.member_code) {
          await supabase
            .from('loyalty_device_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('device_token', storedToken);

          navigate(`/loyalty/${campaignSlug}/${tokenData.loyalty_accounts.member_code}`, { replace: true });
          return true;
        } else {
          localStorage.removeItem(tokenKey);
        }
      }
      return false;
    };

    const fetchCampaign = async () => {
      try {
        const redirected = await checkDeviceToken();
        if (redirected) return;

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

        if (campaignData.status !== 'active') {
          setError('This loyalty program is not currently accepting new enrollments.');
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
        setCheckingDevice(false);
      }
    };

    fetchCampaign();
  }, [campaignSlug, navigate]);

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

  const createDeviceToken = async (loyaltyAccountId) => {
    if (!formData.rememberDevice) return;

    try {
      const deviceToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + DEVICE_TOKEN_EXPIRY_DAYS);

      await supabase.from('loyalty_device_tokens').insert({
        loyalty_account_id: loyaltyAccountId,
        campaign_id: campaign.id,
        device_token: deviceToken,
        device_name: getDeviceName(),
        expires_at: expiresAt.toISOString()
      });

      localStorage.setItem(getDeviceTokenKey(campaignSlug), deviceToken);
    } catch (err) {
      console.error('Error creating device token:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const normalizedEmail = formData.email.trim().toLowerCase();
      const normalizedPhone = formData.phone.trim() || null;

      let birthdayValue = null;
      if (formData.birthdayMonth && formData.birthdayDay) {
        const month = String(formData.birthdayMonth).padStart(2, '0');
        const day = String(formData.birthdayDay).padStart(2, '0');
        birthdayValue = `2000-${month}-${day}`;
      }

      // Find or create a canonical lead for this brand
      let leadId = null;
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id')
        .eq('brand_id', campaign.brand_id)
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
        // Backfill birthday if not set
        if (birthdayValue) {
          await supabase
            .from('leads')
            .update({ birthday: birthdayValue })
            .eq('id', leadId)
            .is('birthday', null);
        }
      } else {
        const { data: newLead, error: leadError } = await supabase
          .from('leads')
          .insert({
            client_id: client.id,
            brand_id: campaign.brand_id,
            name: formData.name.trim(),
            email: normalizedEmail,
            phone: normalizedPhone,
            birthday: birthdayValue,
            source_type: 'loyalty',
          })
          .select('id')
          .single();
        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Check if already enrolled in this campaign
      const { data: existing } = await supabase
        .from('loyalty_accounts')
        .select('id, member_code')
        .eq('campaign_id', campaign.id)
        .eq('lead_id', leadId)
        .maybeSingle();

      if (existing) {
        await createDeviceToken(existing.id);
        navigate(`/loyalty/${campaignSlug}/${existing.member_code}`);
        return;
      }

      const memberCode = generateMemberCode();

      const { data: newAccount, error: insertError } = await supabase
        .from('loyalty_accounts')
        .insert({
          campaign_id: campaign.id,
          client_id: client.id,
          brand_id: campaign.brand_id,
          lead_id: leadId,
          member_code: memberCode,
          current_progress: 0,
          total_visits: 0,
          reward_unlocked: false
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      await createDeviceToken(newAccount.id);
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

  if (loading || checkingDevice) {
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

  if (campaign.status === 'paused') {
    const cardPrimaryColor = campaign?.config?.loyalty?.card?.primaryColor || client?.primary_color || '#F59E0B';
    const screenConfig = campaign?.config?.screens?.enrollment || {};
    const backgroundColor = screenConfig.backgroundColor || client?.background_color || '#18181B';

    const isLightBackground = (color) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155;
    };

    const isDark = !isLightBackground(backgroundColor);

    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: backgroundColor }}
      >
        <div className="w-full max-w-sm text-center">
          {client?.logo_url && (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-16 mx-auto mb-6 object-contain"
            />
          )}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: `${cardPrimaryColor}20` }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10"
              style={{ color: cardPrimaryColor }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold mb-4"
            style={{ color: isDark ? '#FFFFFF' : '#000000' }}
          >
            Program Temporarily Paused
          </h1>
          <p
            className="text-base mb-6"
            style={{ color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)' }}
          >
            This rewards program is temporarily paused and not accepting new enrollments at this time.
          </p>
          <p
            className="text-sm"
            style={{ color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' }}
          >
            Please check back later or contact {client?.name || 'the business'} for more information.
          </p>
        </div>
      </div>
    );
  }

  const screenConfig = campaign?.config?.screens?.enrollment || {};
  const cardPrimaryColor = campaign?.config?.loyalty?.card?.primaryColor || client?.primary_color || '#F59E0B';
  const backgroundColor = screenConfig.backgroundColor || client?.background_color || '#18181B';
  const headingColor = screenConfig.headingColor || '#FFFFFF';
  const bodyColor = screenConfig.bodyColor || '#FFFFFF';
  const buttonColor = screenConfig.buttonColor || cardPrimaryColor;
  const buttonTextColor = screenConfig.buttonTextColor || '#FFFFFF';
  const backgroundImage = screenConfig.backgroundImage || '';
  const primaryColor = buttonColor;

  const threshold = loyaltyConfig?.threshold || campaign?.config?.loyalty?.threshold || 10;
  const rewardName = loyaltyConfig?.reward_name || loyaltyConfig?.rewardName || campaign?.config?.loyalty?.rewardName || 'Free Reward';
  const headline = screenConfig.headline || 'Join Our Rewards Program';
  const subheadline = screenConfig.subheadline || 'Earn stamps with every visit and get rewarded!';
  const buttonText = screenConfig.buttonText || 'Sign Up Now';

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
      style={{
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
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
          <h1 className="text-2xl font-bold mb-2" style={{ color: headingColor }}>
            {headline}
          </h1>
          <p style={{ color: bodyColor, opacity: 0.9 }}>
            {subheadline}
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

          {loyaltyConfig?.birthday_reward_enabled && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FiCalendar size={14} className={mutedTextColor} />
                <label className={`block text-sm ${mutedTextColor}`}>Birthday (optional)</label>
              </div>
              <p className={`text-xs ${mutedTextColor} mb-2`} style={{ opacity: 0.7 }}>
                Get a special reward during your birthday month!
              </p>
              <div className="flex gap-3">
                <select
                  value={formData.birthdayMonth}
                  onChange={(e) => setFormData({ ...formData, birthdayMonth: e.target.value })}
                  className={`flex-1 px-3 py-3 rounded-xl ${inputBg} border ${inputBorder} ${inputFocusBorder} ${inputText} focus:outline-none transition-colors`}
                >
                  <option value="">Month</option>
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                    <option key={m} value={String(i + 1)}>{m}</option>
                  ))}
                </select>
                <select
                  value={formData.birthdayDay}
                  onChange={(e) => setFormData({ ...formData, birthdayDay: e.target.value })}
                  className={`w-24 px-3 py-3 rounded-xl ${inputBg} border ${inputBorder} ${inputFocusBorder} ${inputText} focus:outline-none transition-colors`}
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={String(d)}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

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

          <label className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${hoverBg}`}>
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={formData.rememberDevice}
                onChange={(e) => setFormData({ ...formData, rememberDevice: e.target.checked })}
                className="sr-only"
              />
              <div
                className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                  ${formData.rememberDevice
                    ? 'border-transparent'
                    : isDark ? 'border-white/30' : 'border-gray-400'
                  }
                `}
                style={formData.rememberDevice ? { backgroundColor: primaryColor } : {}}
              >
                {formData.rememberDevice && <FiCheck size={12} className="text-white" />}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <FiSmartphone className={mutedTextColor} size={14} />
                <span className={`text-sm ${mutedTextColor}`}>
                  Remember this device for faster access
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${mutedTextColor}`} style={{ opacity: 0.65 }}>
                Next time you visit this link on this device, you'll go straight to your loyalty card — no need to sign up again.
              </p>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{ backgroundColor: primaryColor, color: buttonTextColor }}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Joining...</span>
              </>
            ) : (
              <>
                <FiHeart size={18} />
                <span>{buttonText}</span>
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