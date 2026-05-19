/**
 * Public app origin for links in emails (password reset) and QR codes.
 * In production, prefers FRONTEND_URL; does not use browser Origin/Referer.
 */

function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return null;
  return url.replace(/\/$/, '');
}

function originFromRequest(req) {
  if (req.headers.origin) {
    return normalizeOrigin(req.headers.origin);
  }
  if (req.headers.referer) {
    try {
      return normalizeOrigin(new URL(req.headers.referer).origin);
    } catch {
      // ignore malformed referer
    }
  }
  return null;
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
function getPublicAppOrigin(req) {
  const configured = normalizeOrigin(process.env.FRONTEND_URL);
  if (configured) return configured;

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const renderUrl = normalizeOrigin(process.env.RENDER_EXTERNAL_URL);
    if (renderUrl) {
      console.warn(
        '[appOrigin] FRONTEND_URL is not set; using RENDER_EXTERNAL_URL:',
        renderUrl
      );
      return renderUrl;
    }
    console.error(
      '[appOrigin] FRONTEND_URL is required in production for email and QR links. ' +
        'Set FRONTEND_URL=https://attend-39qi.onrender.com on Render.'
    );
    return normalizeOrigin(`${req.protocol}://${req.hostname}`);
  }

  const fromRequest = originFromRequest(req);
  if (fromRequest) return fromRequest;

  return 'http://localhost:5173';
}

module.exports = { getPublicAppOrigin, normalizeOrigin };
