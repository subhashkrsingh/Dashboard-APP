let accessToken = '';
let refreshToken = '';
let accessTokenExpiryMs = null;

function decodeJwtPayload(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function parseTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  return Number.isFinite(exp) ? exp * 1000 : null;
}

function setAccessToken(token) {
  accessToken = (token || '').trim();
  accessTokenExpiryMs = parseTokenExpiryMs(accessToken);
}

function setRefreshToken(token) {
  refreshToken = (token || '').trim();
}

function setTokens({ accessToken: nextAccessToken, refreshToken: nextRefreshToken } = {}) {
  if (typeof nextAccessToken === 'string') setAccessToken(nextAccessToken);
  if (typeof nextRefreshToken === 'string') setRefreshToken(nextRefreshToken);
}

function getAccessToken() {
  return accessToken;
}

function getRefreshToken() {
  return refreshToken;
}

function isLoggedIn() {
  return Boolean(accessToken);
}

function accessTokenExpiresSoon(thresholdMs = 0) {
  if (!accessTokenExpiryMs) return false;
  return (accessTokenExpiryMs - Date.now()) <= Math.max(0, Number(thresholdMs) || 0);
}

module.exports = {
  setAccessToken,
  setRefreshToken,
  setTokens,
  getAccessToken,
  getRefreshToken,
  isLoggedIn,
  accessTokenExpiresSoon
};
