// localStorage wrapper with same shape as the artifact's window.storage API.
// Swap this out later for Cloudflare D1/KV if you want cross-device sync.

const KEY = 'daily-logs';
const URL_KEY = 'workout-url';
const TAB_KEY = 'active-tab';

export const storage = {
  async getLogs() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },
  async setLogs(logs) {
    try {
      localStorage.setItem(KEY, JSON.stringify(logs));
      return true;
    } catch {
      return false;
    }
  },
  async getWorkoutUrl() {
    try {
      return localStorage.getItem(URL_KEY) || '';
    } catch {
      return '';
    }
  },
  async setWorkoutUrl(url) {
    try {
      if (url) localStorage.setItem(URL_KEY, url);
      else localStorage.removeItem(URL_KEY);
      return true;
    } catch {
      return false;
    }
  },
  async getActiveTab() {
    try {
      return localStorage.getItem(TAB_KEY) || '';
    } catch {
      return '';
    }
  },
  async setActiveTab(tab) {
    try {
      localStorage.setItem(TAB_KEY, tab);
      return true;
    } catch {
      return false;
    }
  },
};
