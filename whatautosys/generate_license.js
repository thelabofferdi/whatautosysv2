const fs = require('fs');

const key = process.argv[2];

if (!key) {
    console.log('Usage: node generate_license.js <MISTRAL_API_KEY>');
    process.exit(1);
}

const licenseData = {
    mistralApiKey: key,
    generatedAt: new Date().toISOString(),
    version: '1.0'
};

const licenseString = Buffer.from(JSON.stringify(licenseData)).toString('base64');

console.log('\n✅ LICENSE KEY GENERATED:\n');
console.log(licenseString);
console.log('\n📋 Copy and paste this key into the activation screen.');
