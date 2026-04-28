#!/usr/bin/env node
// Run: node generate-secrets.js
// Copy the output into your Render environment variables

const crypto = require('crypto');

console.log('\n🔐 Sparq — Generated Secrets\n');
console.log('Copy these into Render Dashboard → Environment:\n');
console.log('JWT_SECRET=' + crypto.randomBytes(48).toString('hex'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(48).toString('hex'));
console.log('\n⚠️  These are different every time you run this script.');
console.log('⚠️  Changing JWT_SECRET will log out all existing users.\n');
