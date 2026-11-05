/**
 * Test-only convenience: stores the most recent dev-mail token per email so
 * tests can complete email flows without a real SMTP server.
 * Never read by production endpoints; tokens are hashed at rest regardless.
 */
export const latestDevToken = new Map(); // email -> raw token
