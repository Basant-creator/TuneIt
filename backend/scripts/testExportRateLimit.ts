import { checkAndIncrementExportLimit } from '../src/utils/exportRateLimiter';

function testExportRateLimit() {
  console.log('================================================================');
  console.log('Testing Daily Export Rate Limiter (Max 3/day per IP)');
  console.log('================================================================\n');

  const testIp = '192.168.1.100';

  console.log('--> Attempt 1:');
  const r1 = checkAndIncrementExportLimit(testIp, 3);
  console.log('Result 1:', r1);

  console.log('\n--> Attempt 2:');
  const r2 = checkAndIncrementExportLimit(testIp, 3);
  console.log('Result 2:', r2);

  console.log('\n--> Attempt 3:');
  const r3 = checkAndIncrementExportLimit(testIp, 3);
  console.log('Result 3:', r3);

  console.log('\n--> Attempt 4 (Exceeds limit):');
  const r4 = checkAndIncrementExportLimit(testIp, 3);
  console.log('Result 4:', r4);

  console.log('\n================================================================');
  if (r1.allowed && r2.allowed && r3.allowed && !r4.allowed) {
    console.log('✅ SUCCESS! 3 exports allowed, 4th attempt correctly blocked (allowed: false)!');
  } else {
    console.log('❌ FAIL: Rate limiter did not enforce 3/day quota.');
  }
  console.log('================================================================\n');
}

testExportRateLimit();
