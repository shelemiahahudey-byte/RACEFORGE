const assert = require('assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../server/config/env');

async function testAuth() {
  console.log('🧪 Testing Authentication Subsystem...');

  // 1. Password Hashing
  const plainPassword = 'SuperSecretRacerPassword!9';
  const hash = await bcrypt.hash(plainPassword, 10);
  assert.ok(hash !== plainPassword, 'Hash must not equal plain password');
  const isMatch = await bcrypt.compare(plainPassword, hash);
  assert.strictEqual(isMatch, true, 'Bcrypt compare must succeed for matching password');

  // 2. JWT Generation and Verification
  const payload = { id: 42, username: 'ApexHunter', email: 'apexhunter@raceforge.com' };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });
  assert.ok(typeof token === 'string' && token.length > 20, 'Token must be valid string');

  const decoded = jwt.verify(token, config.jwt.secret);
  assert.strictEqual(decoded.id, 42, 'Decoded user ID must match');
  assert.strictEqual(decoded.username, 'ApexHunter', 'Decoded username must match');

  console.log('✅ Auth tests passed successfully.');
}

module.exports = testAuth;
