#!/usr/bin/env node
require('dotenv').config();
const https = require('https');
const dns = require('dns').promises;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHANNEL = process.env.TELEGRAM_CHANNEL_ID;

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { family: 4, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      family: 4,
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.write(postData);
    req.end();
  });
}

console.log('🔍 OzBargain Bot Diagnostic\n');

(async () => {
  // 0. DNS
  console.log('0️⃣  DNS Resolution...');
  let dnsOK = true;
  for (const domain of ['api.telegram.org', 'www.google.com', 'www.ozbargain.com.au']) {
    try {
      const addrs = await dns.resolve4(domain);
      console.log(`   ✓ ${domain} → ${addrs[0]}`);
    } catch (e) {
      console.log(`   ❌ ${domain} → FAILED`);
      dnsOK = false;
    }
  }
  console.log('');

  // 1. Env vars
  console.log('1️⃣  Environment...');
  if (!TOKEN) { console.log('   ❌ TELEGRAM_BOT_TOKEN missing\n'); process.exit(1); }
  if (!CHANNEL) { console.log('   ❌ TELEGRAM_CHANNEL_ID missing\n'); process.exit(1); }
  console.log(`   ✓ TOKEN: ${TOKEN.substring(0, 10)}...`);
  console.log(`   ✓ CHANNEL: ${CHANNEL}\n`);

  // 2. Internet
  console.log('2️⃣  Internet...');
  let netOK = false;
  try {
    await httpsGet('https://www.google.com');
    console.log('   ✓ Internet OK\n');
    netOK = true;
  } catch (e) {
    console.log('   ❌ No internet\n');
    process.exit(1);
  }

  // 3. Telegram API
  console.log('3️⃣  Telegram API...');
  let tgOK = false;
  try {
    await httpsGet('https://api.telegram.org');
    console.log('   ✓ Reachable\n');
    tgOK = true;
  } catch (e) {
    console.log('   ❌ Cannot reach:', e.message, '\n');
  }

  // 4. Bot token
  console.log('4️⃣  Bot Token...');
  let tokenOK = false;
  try {
    const res = await httpsGet(`https://api.telegram.org/bot${TOKEN}/getMe`);
    const data = JSON.parse(res.data);
    if (data.ok) {
      console.log(`   ✓ Valid - @${data.result.username}\n`);
      tokenOK = true;
    } else {
      console.log('   ❌ Invalid\n');
      process.exit(1);
    }
  } catch (e) {
    console.log('   ❌ Error:', e.message, '\n');
    process.exit(1);
  }

  // 5. Channel
  console.log('5️⃣  Channel Access...');
  let chanOK = false;
  try {
    const res = await httpsPost(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      { chat_id: CHANNEL, text: '✅ Test' }
    );
    const data = JSON.parse(res.data);
    if (data.ok) {
      console.log('   ✓ Message sent!\n');
      chanOK = true;
    } else {
      console.log('   ❌', data.description, '\n');
    }
  } catch (e) {
    console.log('   ❌', e.message, '\n');
  }

  // 6. OzBargain
  console.log('6️⃣  OzBargain...');
  try {
    const res = await httpsGet('https://www.ozbargain.com.au/');
    console.log(res.status === 200 ? '   ✓ Accessible\n' : `   ⚠️  Status ${res.status}\n`);
  } catch (e) {
    console.log('   ❌ Failed\n');
  }

  // 7. RSS
  console.log('7️⃣  RSS Feed...');
  try {
    const res = await httpsGet('https://www.ozbargain.com.au/deals/feed');
    console.log(res.data.includes('<rss') ? '   ✓ Accessible\n' : '   ⚠️  Unexpected\n');
  } catch (e) {
    console.log('   ❌ Failed\n');
  }

  console.log('═══════════════════════════\n');
  console.log('📊 Summary:');
  console.log(`   DNS: ${dnsOK ? '✓' : '❌'}`);
  console.log(`   Internet: ${netOK ? '✓' : '❌'}`);
  console.log(`   Telegram: ${tgOK ? '✓' : '❌'}`);
  console.log(`   Token: ${tokenOK ? '✓' : '❌'}`);
  console.log(`   Channel: ${chanOK ? '✓' : '❌'}`);
  console.log('');

  if (dnsOK && netOK && tgOK && tokenOK && chanOK) {
    console.log('✅ All tests passed!\n');
  } else {
    console.log('⚠️  Some tests failed. Fix above issues.\n');
  }
})();
