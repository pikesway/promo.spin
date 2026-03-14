export const getDefaultColors = () => ({
  primary: '#6366F1',
  secondary: '#8B5CF6',
  background: '#09090B'
});

export const resolveClientBranding = (campaign, client) => {
  if (!campaign || !client) {
    return getDefaultColors();
  }

  const useClientBranding = campaign.config?.branding?.useClientBranding !== false;

  if (useClientBranding) {
    return {
      primary: client.primary_color || getDefaultColors().primary,
      secondary: client.secondary_color || getDefaultColors().secondary,
      background: client.background_color || getDefaultColors().background,
      logo: client.logo_url
    };
  }

  return {
    primary: campaign.config?.branding?.customColors?.primary || getDefaultColors().primary,
    secondary: campaign.config?.branding?.customColors?.secondary || getDefaultColors().secondary,
    background: campaign.config?.branding?.customColors?.background || getDefaultColors().background,
    logo: campaign.config?.branding?.customLogo || client.logo_url
  };
};

export const validateHexColor = (color) => {
  if (!color) return false;
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
};

export const getStatusConfig = (status) => {
  const configs = {
    prospect: {
      color: '#3B82F6',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-500',
      label: 'Prospect',
      action: 'Send demo video',
      description: 'Potential client in evaluation stage'
    },
    active: {
      color: '#10B981',
      bgColor: 'bg-green-500',
      textColor: 'text-green-500',
      label: 'Active',
      action: 'Monitor performance',
      description: 'Paying client with active campaigns'
    },
    idle: {
      color: '#F59E0B',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-500',
      label: 'Idle',
      action: 'Propose a Scratch promo',
      description: 'Client with no recent activity'
    },
    paused: {
      color: '#F97316',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-500',
      label: 'Paused',
      action: 'Check in next month',
      description: 'Temporarily inactive by request'
    },
    churned: {
      color: '#EF4444',
      bgColor: 'bg-red-500',
      textColor: 'text-red-500',
      label: 'Churned',
      action: 'Send "We Miss You" offer',
      description: 'Former client, needs win-back campaign'
    }
  };

  return configs[status] || configs.prospect;
};

export const getClientBrandingDefaults = () => ({
  logo_type: 'url',
  logo_url: '',
  primary_color: getDefaultColors().primary,
  secondary_color: getDefaultColors().secondary,
  background_color: getDefaultColors().background
});

export const prepareBrandingForCampaign = (client, useClientBranding = true) => {
  if (!useClientBranding) {
    return {
      branding: {
        useClientBranding: false,
        customColors: {
          primary: getDefaultColors().primary,
          secondary: getDefaultColors().secondary,
          background: getDefaultColors().background
        }
      }
    };
  }

  return {
    branding: {
      useClientBranding: true
    }
  };
};

export const getBrandingPreview = (colors) => {
  return {
    gradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background
  };
};
