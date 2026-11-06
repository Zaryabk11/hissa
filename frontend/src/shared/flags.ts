// Snaps ship dark: the app only sends and shows them when this is 'true' (the API has its own SNAPS_ENABLED).
export const snapsEnabled = process.env.EXPO_PUBLIC_SNAPS_ENABLED === 'true';
