// Test script to verify hash generation
const crypto = require('crypto');

const pin = '11223344';
const hash = crypto.createHash('sha256').update(pin).digest('hex');

console.log('PIN:', pin);
console.log('SHA256 Hash:', hash);
console.log('Hash length:', hash.length);

// Expected hash from database
const dbHash = '4f9f10b304cfe9b2b11fcb1387f694e18f08ea358c7e9f567434d3ad6cbd7fc4';
console.log('\nDatabase hash:', dbHash);
console.log('Hashes match:', hash === dbHash);
