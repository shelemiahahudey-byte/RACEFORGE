const testAuth = require('./auth.test');
const testGameValidation = require('./gameValidation.test');

async function runAll() {
  console.log('==============================================');
  console.log('🏁 RACEFORGE AUTOMATED TEST SUITE');
  console.log('==============================================');
  try {
    await testAuth();
    await testGameValidation();
    console.log('==============================================');
    console.log('🎉 ALL BACKEND & AUTHORITATIVE TESTS PASSED!');
    console.log('==============================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite failure:', err);
    process.exit(1);
  }
}

runAll();
