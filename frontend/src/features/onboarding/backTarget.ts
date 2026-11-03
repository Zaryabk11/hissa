/** Where Back goes from an onboarding step with no history: the landing page exists on the web only, so the app asks the index redirector. */
export const backFallback = (os: string): '/landing' | '/' => (os === 'web' ? '/landing' : '/');
