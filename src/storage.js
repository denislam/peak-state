// localStorage wrapper with same shape as the artifact's window.storage API.
// Swap this out later for Cloudflare D1/KV if you want cross-device sync.

const KEY = 'daily-logs';

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
};
