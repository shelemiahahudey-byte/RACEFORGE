// Fallback in-memory rate limiter to protect authentication & critical endpoints
const rateLimitMap = new Map();

function rateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please slow down.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const clientData = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 1;
      clientData.resetTime = now + windowMs;
    } else {
      clientData.count++;
    }

    rateLimitMap.set(ip, clientData);

    if (clientData.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSec: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }

    next();
  };
}

module.exports = { rateLimiter };
