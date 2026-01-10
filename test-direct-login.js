// Direct login test
const crypto = require('crypto');

// Simulate what the app does
const userName = 'A';
const pin = '11223344';

// Generate hash using Node.js (same algorithm as Expo Crypto)
const hash = crypto.createHash('sha256').update(pin).digest('hex');

console.log('Username:', userName);
console.log('PIN:', pin);
console.log('Generated Hash:', hash);
console.log('\nExpected DB Hash: 4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4');
console.log('Match:', hash === '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4');

// Now test with Supabase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('\n--- Testing Supabase Query ---');

  const { data, error } = await supabase
    .from('app_security')
    .select('id, user_name, pin_hash, role, is_active')
    .eq('user_name', userName)
    .maybeSingle();

  if (error) {
    console.log('Error:', error);
    return;
  }

  if (!data) {
    console.log('No user found!');
    return;
  }

  console.log('User found:', data.user_name);
  console.log('User role:', data.role);
  console.log('User active:', data.is_active);
  console.log('DB Hash:', data.pin_hash);
  console.log('Generated Hash:', hash);
  console.log('Hashes Match:', data.pin_hash === hash);

  if (data.pin_hash === hash) {
    console.log('\n✓ LOGIN SUCCESSFUL!');
  } else {
    console.log('\n✗ LOGIN FAILED - Hashes do not match');
  }
}

testLogin().catch(console.error);
