export const initializeCampaignConfig = (type, client) => {
  const primaryColor = client?.primary_color || '#6366F1';
  const secondaryColor = client?.secondary_color || '#8B5CF6';
  const backgroundColor = client?.background_color || '#09090B';

  const defaultSegments = [
    { text: '10% Off', probability: 25, color: primaryColor, isWin: true },
    { text: 'Free Shipping', probability: 20, color: secondaryColor, isWin: true },
    { text: 'Try Again', probability: 30, color: '#6B7280', isWin: false },
    { text: '$5 Credit', probability: 15, color: primaryColor, isWin: true },
    { text: 'Better Luck', probability: 10, color: '#6B7280', isWin: false }
  ];

  const defaultPrizes = [
    { id: 1, name: '10% Off', probability: 25, isWin: true, backgroundImage: '', winHeadline: 'You Won!', winMessage: 'Enjoy 10% off your purchase!' },
    { id: 2, name: 'Free Shipping', probability: 20, isWin: true, backgroundImage: '', winHeadline: 'Congratulations!', winMessage: 'Free shipping on your order!' },
    { id: 3, name: 'Try Again', probability: 30, isWin: false, backgroundImage: '', winHeadline: '', winMessage: '' },
    { id: 4, name: '$5 Credit', probability: 15, isWin: true, backgroundImage: '', winHeadline: 'You Won!', winMessage: '$5 credit added to your account!' },
    { id: 5, name: 'Better Luck Next Time', probability: 10, isWin: false, backgroundImage: '', winHeadline: '', winMessage: '' }
  ];

  const isScratch = type === 'scratch';
  const isBizGamez = type === 'bizgamez';

  if (isBizGamez) {
    return {
      bizgamez_code: '',
      game_url: '',
      qr_code_image: '',
      embed_code: '',
      prizes: [
        { score: 1, name: 'Grand Prize', isWin: true, winHeadline: 'You Won!', winMessage: 'Congratulations on winning the grand prize!' },
        { score: 0, name: 'Try Again', isWin: false, winHeadline: '', winMessage: '' }
      ],
      redemption: {
        expirationDays: 30
      }
    };
  }

  const config = {
    screens: {
      start: {
        enabled: true,
        headline: isScratch ? 'Scratch to Win!' : 'Spin to Win!',
        subheading: isScratch ? 'Scratch the card to reveal your prize' : 'Try your luck and win amazing prizes',
        logo: client?.logo_url || '',
        buttonText: 'Start Game',
        rulesText: '',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      },
      game: {
        enabled: true,
        instructions: isScratch ? 'Scratch to reveal your prize!' : 'Tap SPIN to win!',
        spinButtonText: 'SPIN NOW',
        showInstructions: true,
        showSoundToggle: true,
        useCustomButtonColor: false,
        buttonColor: '#16a34a',
        buttonTextColor: '#ffffff'
      },
      win: {
        enabled: true,
        headline: 'Congratulations!',
        message: 'You won {prize}!',
        buttonText: 'Continue',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      },
      lose: {
        enabled: true,
        headline: 'Almost!',
        message: 'Better luck next time. Thanks for playing!',
        showRetryButton: false,
        retryButtonText: 'Try Again',
        continueButtonText: 'Continue',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      },
      leadCapture: {
        enabled: true,
        headline: 'Claim Your Prize',
        description: 'Enter your details to receive your prize',
        fields: [
          { id: 'name', label: 'Name', type: 'text', required: true, placeholder: 'John Doe' },
          { id: 'email', label: 'Email', type: 'email', required: true, placeholder: 'john@example.com' }
        ],
        requireConsent: true,
        consentText: 'I agree to receive promotional emails and updates',
        submitButtonText: 'Submit',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      },
      redemption: {
        enabled: true,
        headline: 'Your Prize Code',
        instructions: 'Show this code to redeem your prize',
        showQRCode: true,
        expiryDays: 30,
        buttonText: 'Done',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      },
      thankYou: {
        enabled: true,
        headline: 'Thank You!',
        message: 'We appreciate your participation. Check your email for details.',
        showSocialShare: false,
        buttonText: 'Close',
        useCustomButtonColor: false,
        buttonColor: primaryColor,
        buttonTextColor: '#ffffff'
      }
    },
    visual: {
      background: {
        type: 'color',
        color: backgroundColor,
        gradientStart: primaryColor,
        gradientEnd: secondaryColor,
        gradientDirection: 'to bottom',
        image: '',
        imageScale: 'cover',
        blur: 0,
        overlay: 0,
        overlayColor: '#000000'
      },
      buttons: {
        backgroundColor: primaryColor,
        textColor: '#ffffff'
      },
      fonts: {
        primary: 'system-ui, -apple-system, sans-serif',
        secondary: 'system-ui, -apple-system, sans-serif'
      }
    },
    settings: {
      spinLimit: 'one-per-user',
      spinDelayHours: 24,
      calendarResetFrequency: 'weekly',
      calendarResetDay: 1,
      timezone: 'UTC',
      startDate: null,
      endDate: null
    }
  };

  if (isScratch) {
    config.visual.scratch = {
      containerAspectRatio: '4:3',
      foregroundImage: '',
      logoOverlay: client?.logo_url || '',
      logoPosition: 'top-right',
      scratchThreshold: 50,
      brushRadius: 40
    };
    config.prizes = defaultPrizes;
  } else {
    config.segments = defaultSegments;
  }

  return config;
};

export const campaignToGame = (campaign, client) => {
  if (!campaign) return null;

  const config = campaign.config || {};

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    isActive: campaign.status === 'active',
    createdAt: campaign.created_at,
    screens: config.screens || {},
    visual: config.visual || {},
    settings: {
      ...config.settings,
      startDate: campaign.start_date,
      endDate: campaign.end_date
    },
    segments: config.segments || [],
    prizes: config.prizes || []
  };
};

export const gameDataToCampaignConfig = (gameData) => {
  if (!gameData) return {};

  const config = {
    screens: gameData.screens || {},
    visual: gameData.visual || {},
    settings: {
      spinLimit: gameData.settings?.spinLimit,
      spinDelayHours: gameData.settings?.spinDelayHours,
      calendarResetFrequency: gameData.settings?.calendarResetFrequency,
      calendarResetDay: gameData.settings?.calendarResetDay,
      timezone: gameData.settings?.timezone
    },
    segments: gameData.segments || [],
    prizes: gameData.prizes || []
  };

  return config;
};

export const gameDataToCampaignUpdates = (gameData, originalCampaign) => {
  const config = gameDataToCampaignConfig(gameData);

  return {
    name: gameData.name,
    start_date: gameData.settings?.startDate || null,
    end_date: gameData.settings?.endDate || null,
    config
  };
};

export const updateCampaignAnalytics = (currentAnalytics, event, data = {}) => {
  const analytics = currentAnalytics || {
    views: 0,
    unique_views: 0,
    spins: 0,
    wins: 0,
    losses: 0,
    leads: 0,
    redemptions: 0
  };

  switch (event) {
    case 'view':
      analytics.views = (analytics.views || 0) + 1;
      break;
    case 'unique_view':
      analytics.unique_views = (analytics.unique_views || 0) + 1;
      break;
    case 'spin':
      analytics.spins = (analytics.spins || 0) + 1;
      if (data.isWin) {
        analytics.wins = (analytics.wins || 0) + 1;
      } else {
        analytics.losses = (analytics.losses || 0) + 1;
      }
      break;
    case 'lead':
      analytics.leads = (analytics.leads || 0) + 1;
      break;
    case 'redemption':
      analytics.redemptions = (analytics.redemptions || 0) + 1;
      break;
  }

  analytics.win_rate = analytics.spins > 0
    ? Math.round((analytics.wins / analytics.spins) * 100)
    : 0;

  return analytics;
};
