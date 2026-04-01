export function generateTriviaLaunchURL(campaignId) {
  const triviaBaseUrl = import.meta.env.VITE_TRIVIA_RUNTIME_URL;

  if (!triviaBaseUrl) {
    console.warn('VITE_TRIVIA_RUNTIME_URL is not configured');
    return null;
  }

  if (!campaignId) {
    console.warn('Campaign ID is required to generate trivia launch URL');
    return null;
  }

  const returnUrl = `${window.location.origin}/c/${campaignId}/leaderboard`;
  const encodedReturnUrl = encodeURIComponent(returnUrl);

  const url = `${triviaBaseUrl}/?campaign_id=${campaignId}&return_url=${encodedReturnUrl}`;

  return url;
}

export function isTriviaConfigured() {
  return !!import.meta.env.VITE_TRIVIA_RUNTIME_URL;
}
