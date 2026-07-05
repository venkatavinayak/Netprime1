const crypto = require('crypto');
const logger = require('../utils/logger');

let cachedJwks = null;
let cachedJwksAt = 0;
const JWKS_CACHE_MS = 10 * 60 * 1000;

const base64UrlDecode = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
};

const parseJwt = (token) => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid Clerk token structure.');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signedContent: `${parts[0]}.${parts[1]}`,
    signature: parts[2]
  };
};

const getJwksUrl = (issuer) => {
  if (process.env.CLERK_JWKS_URL) return process.env.CLERK_JWKS_URL.trim();
  if (!issuer || !issuer.startsWith('https://')) {
    throw new Error('Missing valid Clerk token issuer. Set CLERK_JWKS_URL if needed.');
  }
  return `${issuer.replace(/\/$/, '')}/.well-known/jwks.json`;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url}`);
  }
  return response.json();
};

const getJwks = async (issuer) => {
  const now = Date.now();
  if (cachedJwks && now - cachedJwksAt < JWKS_CACHE_MS) {
    return cachedJwks;
  }

  const jwksUrl = getJwksUrl(issuer);
  cachedJwks = await fetchJson(jwksUrl);
  cachedJwksAt = now;
  return cachedJwks;
};

const verifySignature = (jwk, signedContent, signature) => {
  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(signedContent);
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, 'base64url'));
};

const verifyClerkSessionToken = async (sessionToken) => {
  const { header, payload, signedContent, signature } = parseJwt(sessionToken);

  if (header.alg !== 'RS256') {
    throw new Error('Unsupported Clerk token algorithm.');
  }

  const jwks = await getJwks(payload.iss);
  const jwk = jwks.keys.find(key => key.kid === header.kid);
  if (!jwk) {
    cachedJwks = null;
    throw new Error('Clerk signing key not found.');
  }

  if (!verifySignature(jwk, signedContent, signature)) {
    throw new Error('Invalid Clerk token signature.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Clerk session token expired.');
  }

  if (payload.nbf && payload.nbf > now) {
    throw new Error('Clerk session token is not active yet.');
  }

  if (process.env.CLERK_ISSUER && payload.iss !== process.env.CLERK_ISSUER.trim()) {
    throw new Error('Unexpected Clerk token issuer.');
  }

  return payload;
};

const getClerkUserProfile = async (clerkUserId) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not configured.');
  }

  const user = await fetchJson(`https://api.clerk.com/v1/users/${encodeURIComponent(clerkUserId)}`, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const primaryEmail = user.email_addresses?.find(email => email.id === user.primary_email_address_id)
    || user.email_addresses?.[0];

  if (!primaryEmail?.email_address) {
    throw new Error('Clerk user does not have an email address.');
  }

  return {
    clerkUserId: user.id,
    email: primaryEmail.email_address.toLowerCase(),
    name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || primaryEmail.email_address.split('@')[0],
    avatar: user.image_url || 'avatar1.png'
  };
};

const verifyClerkSession = async (sessionToken) => {
  const payload = await verifyClerkSessionToken(sessionToken);
  const profile = await getClerkUserProfile(payload.sub);
  logger.info('Verified Clerk session for %s', profile.email);
  return profile;
};

module.exports = { verifyClerkSession };
