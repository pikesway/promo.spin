export const initializeCampaignConfig = (type, client) => {
  const primaryColor = client?.primary_color || '#6366F1';
  const secondaryColor = client?.secondary_color || '#8B5CF6';
  const backgroundColor = client?.background_color || '#09090B';

  if (type === 'bizgamez') {
    return {
      bizgamez_code: '',
      game_url: '',
      qr_code_image: '',
      embed_code: '',
      prizes: [
        { score: 1, name: 'Grand Prize', isWin: true, winHeadline: 'You Won!', winMessage: 'Congratulations on winning the grand prize!' },
        { score: 0, name: 'Try Again', isWin: false, winHeadline: '', winMessage: '' }
      ],
      redemption: { expirationDays: 30 }
    };
  }

  if (type === 'loyalty') {
    return {
      loyalty: {
        programType: 'visit',
        threshold: 10,
        validationMethod: 'pin',
        validationConfig: {},
        rewardName: 'Free Reward',
        rewardDescription: '',
        resetBehavior: 'reset',
        lockoutThreshold: 3,
        coolDownHours: 0
      },
      visual: {
        background: {
          type: 'color',
          color: backgroundColor,
          gradientStart: primaryColor,
          gradientEnd: secondaryColor,
          gradientDirection: 'to bottom'
        }
      },
      screens: {
        card: {
          headline: 'Your Loyalty Card',
          subheading: 'Collect stamps and earn rewards!',
          logo: client?.logo_url || '',
          showProgress: true,
          showQRCode: true
        },
        reward: {
          headline: 'Reward Unlocked!',
          message: 'You have earned your reward!',
          buttonText: 'Redeem Now'
        },
        redemption: {
          headline: 'Your Reward',
          instructions: 'Show this code to redeem',
          expiryDays: 30
        }
      }
    };
  }

  return {};
};

export const updateCampaignAnalytics = (currentAnalytics, event, data = {}) => {
  const analytics = currentAnalytics || { views: 0, unique_views: 0, leads: 0 };

  switch (event) {
    case 'view':
      analytics.views = (analytics.views || 0) + 1;
      break;
    case 'unique_view':
      analytics.unique_views = (analytics.unique_views || 0) + 1;
      break;
    case 'lead':
      analytics.leads = (analytics.leads || 0) + 1;
      break;
  }

  return analytics;
};