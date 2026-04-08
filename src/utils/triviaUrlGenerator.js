export function generateTriviaLaunchURL(campaignId, templateId = null, instanceId = null) {
  const triviaBaseUrl = import.meta.env.VITE_TRIVIA_RUNTIME_URL;

  if (!triviaBaseUrl) {
    console.warn('VITE_TRIVIA_RUNTIME_URL is not configured');
    return null;
  }

  if (!campaignId) {
    console.warn('Campaign ID is required to generate trivia launch URL');
    return null;
  }

  let leaderboardUrl = `${window.location.origin}/public/leaderboard?campaign_id=${campaignId}`;

  if (instanceId) {
    leaderboardUrl += `&instance_id=${instanceId}`;
  }

  const encodedReturnUrl = encodeURIComponent(leaderboardUrl);

  let url = `${triviaBaseUrl}/?campaign_id=${campaignId}`;

  if (templateId) {
    url += `&template_id=${templateId}`;
  }

  if (instanceId) {
    url += `&instance_id=${instanceId}`;
  }

  url += `&return_url=${encodedReturnUrl}`;

  return url;
}

export function isTriviaConfigured() {
  return !!import.meta.env.VITE_TRIVIA_RUNTIME_URL;
}
