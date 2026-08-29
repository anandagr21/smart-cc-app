// UTM-tagged URLs — one per placement (see marketing/07-UTM-TRACKING.md §3)
const PLAY_BASE = "https://play.google.com/store/apps/details?id=com.smartcc.app";
const WEB_BASE = "https://app.akaovia.com";

const utm = (base: string, source: string, medium: string, campaign = "beta-launch") => {
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
};

export const GOOGLE_PLAY_URL = utm(PLAY_BASE, "landing", "hero"); // Hero primary CTA
export const GOOGLE_PLAY_URL_NAV = utm(PLAY_BASE, "landing", "navbar");
export const GOOGLE_PLAY_URL_CTA = utm(PLAY_BASE, "landing", "cta-section");
export const GOOGLE_PLAY_URL_FOOTER = utm(PLAY_BASE, "landing", "footer");
export const APP_WEB_URL = utm(WEB_BASE, "landing", "web-app");
export const APP_WEB_URL_NAV = utm(WEB_BASE, "landing", "web-app-nav");
