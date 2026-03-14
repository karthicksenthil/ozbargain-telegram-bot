require('dotenv').config();
const cheerio = require('cheerio');
const https = require('https');

if (process.version.split('.')[0].replace('v', '') < 18) {
  console.error('❌ Node.js 18+ required. Current:', process.version);
  process.exit(1);
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const CHECK_INTERVAL = 3600000; // Check every 1 hour (60 minutes * 60 seconds * 1000 ms)
const UPVOTE_THRESHOLD = 50;
const RSS_FEED_URL = 'https://www.ozbargain.com.au/deals/feed';
const POST_AGE_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
  console.error('❌ TELEGRAM_BOT_TOKEN not set!');
  process.exit(1);
}

if (!TELEGRAM_CHANNEL_ID || TELEGRAM_CHANNEL_ID === '@yourchannel') {
  console.error('❌ TELEGRAM_CHANNEL_ID not set!');
  process.exit(1);
}

const checkedPosts = new Map();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isPost = options.method === 'POST';
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 15000,
      family: 4
    };
    
    if (isPost && options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, statusCode: res.statusCode, data });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    if (isPost && options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function telegramGetMe() {
  const response = await httpsRequest(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
  const data = JSON.parse(response.data);
  if (data.ok) return data.result;
  throw new Error(data.description || 'Failed');
}

async function telegramSendMessage(chatId, text, options = {}) {
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: options.parse_mode || 'Markdown',
    disable_web_page_preview: options.disable_web_page_preview || false
  };
  
  const response = await httpsRequest(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    { method: 'POST', body: payload }
  );
  
  const data = JSON.parse(response.data);
  if (!data.ok) {
    const error = new Error(data.description || 'Failed');
    error.code = data.error_code;
    throw error;
  }
  return data.result;
}

function extractDealId(url) {
  const match = url.match(/\/node\/(\d+)/);
  return match ? match[1] : null;
}

async function fetchDealUpvotes(dealUrl, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await sleep(2000);
      
      const response = await httpsRequest(dealUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (response.statusCode !== 200) continue;

      const $ = cheerio.load(response.data);
      let upvoteText = $('.voteup .nvb').first().text().trim();
      if (!upvoteText) upvoteText = $('.voteup').first().text().match(/\d+/)?.[0] || '0';
      
      return parseInt(upvoteText) || 0;

    } catch (error) {
      if (attempt === retries - 1) return null;
      await sleep(5000 * (attempt + 1));
    }
  }
  return null;
}

/**
 * Parse RSS feed using cheerio (XML parser)
 */
async function fetchDealsFromRSS() {
  try {
    console.log('📡 Fetching RSS...');
    
    const response = await httpsRequest(RSS_FEED_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`RSS feed returned status ${response.statusCode}`);
    }
    
    // Parse XML using cheerio
    const $ = cheerio.load(response.data, { xmlMode: true });
    const deals = [];
    const now = Date.now();

    $('item').each((i, item) => {
      const $item = $(item);
      const title = $item.find('title').text();
      const link = $item.find('link').text();
      const description = $item.find('description').text();
      const pubDate = $item.find('pubDate').text();
      
      // Check if post is within last 24 hours
      const postDate = new Date(pubDate);
      const postAge = now - postDate.getTime();
      
      if (postAge > POST_AGE_LIMIT) {
        console.log(`   Skipping old post (${Math.round(postAge / 3600000)}h old): ${title.substring(0, 40)}...`);
        return; // Skip posts older than 24 hours
      }
      
      const dealId = extractDealId(link);
      if (!dealId) return;

      // Parse description HTML for merchant
      const $desc = cheerio.load(description);
      const merchant = $desc('a').first().text().trim() || 'Unknown';
      
      // Extract price
      const price = description.match(/\$[\d,]+\.?\d*/)?.[0] || 'N/A';

      deals.push({ 
        id: dealId, 
        title: title.trim(), 
        url: link.trim(), 
        merchant, 
        price,
        age: Math.round(postAge / 3600000) // Age in hours
      });
    });

    console.log(`✓ Found ${deals.length} deals from last 24 hours`);
    return deals;
  } catch (error) {
    console.error('RSS error:', error.message);
    return [];
  }
}

async function sendNotification(deal) {
  console.log(`   → Preparing notification for: ${deal.title}`);
  
  // Escape ALL special characters for MarkdownV2
  const escapeMarkdown = (text) => {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
  };
  
  const message = `
🔥 *Hot Deal Alert\\!* 🔥

*${escapeMarkdown(deal.title)}*

💰 Price: ${escapeMarkdown(deal.price)}
🏪 Store: ${escapeMarkdown(deal.merchant)}
👍 Upvotes: *${deal.upvotes}*

🔗 [View Deal](${deal.url})
  `.trim();

  console.log(`   → Message length: ${message.length} chars`);
  
  let retries = 0;
  while (retries < 3) {
    try {
      console.log(`   → Sending to Telegram (attempt ${retries + 1}/3)...`);
      await telegramSendMessage(TELEGRAM_CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false
      });
      console.log(`✓ Successfully sent: ${deal.title} (${deal.upvotes})`);
      return;
    } catch (error) {
      retries++;
      console.error(`   ❌ Send failed (attempt ${retries}/3): ${error.message}`);
      if (error.code) console.error(`      Error code: ${error.code}`);
      if (retries < 3) {
        console.log(`      Retrying in ${5 * retries} seconds...`);
        await sleep(5000 * retries);
      }
    }
  }
  console.error(`   ❌ Failed to send notification after 3 attempts`);
}

async function monitorDeals() {
  console.log(`🔍 Checking for ${UPVOTE_THRESHOLD}+ upvotes (last 24 hours)...`);
  
  const deals = await fetchDealsFromRSS();
  let checked = 0, sent = 0;

  console.log(`   Found ${deals.length} deals from last 24 hours`);

  for (const deal of deals) {
    const cached = checkedPosts.get(deal.id);
    if (cached?.notified) {
      console.log(`   Skipping ${deal.id} - already notified`);
      continue;
    }

    console.log(`  Checking: ${deal.title.substring(0, 50)}... (${deal.age}h old)`);
    const upvotes = await fetchDealUpvotes(deal.url);
    checked++;

    if (upvotes === null) {
      console.warn(`   ⚠️  Could not fetch upvotes for ${deal.id}`);
      continue;
    }

    console.log(`   Deal ${deal.id}: ${upvotes} upvotes (threshold: ${UPVOTE_THRESHOLD})`);
    
    checkedPosts.set(deal.id, { upvotes, notified: false });

    if (upvotes >= UPVOTE_THRESHOLD && !cached?.notified) {
      deal.upvotes = upvotes;
      console.log(`  📢 SENDING NOTIFICATION: ${deal.title} has ${upvotes} upvotes!`);
      await sendNotification(deal);
      checkedPosts.set(deal.id, { upvotes, notified: true });
      sent++;
      await sleep(2000);
    } else {
      console.log(`   Not enough upvotes yet (${upvotes}/${UPVOTE_THRESHOLD})`);
    }
  }

  console.log(`✓ Checked ${checked} deals, sent ${sent} notifications`);
  console.log(`  Next check in 1 hour`);
}

function cleanupCache() {
  if (checkedPosts.size > 500) {
    const toRemove = Array.from(checkedPosts.entries()).slice(0, checkedPosts.size - 500);
    toRemove.forEach(([id]) => checkedPosts.delete(id));
  }
}

async function start() {
  console.log('🤖 OzBargain Bot (RSS Mode)');
  console.log(`📊 Channel: ${TELEGRAM_CHANNEL_ID}`);
  console.log(`📊 Threshold: ${UPVOTE_THRESHOLD} upvotes`);
  console.log(`⏰ Check Interval: ${CHECK_INTERVAL / 60000} minutes (${CHECK_INTERVAL / 3600000} hour)`);
  console.log(`📅 Post Age Limit: ${POST_AGE_LIMIT / 3600000} hours`);
  console.log('');

  console.log('🔐 Testing Telegram...');
  try {
    const bot = await telegramGetMe();
    console.log(`✓ Connected as @${bot.username}`);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }

  console.log('📢 Testing channel...');
  try {
    await telegramSendMessage(TELEGRAM_CHANNEL_ID, '🤖 Bot started (RSS)!');
    console.log('✓ Test sent');
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('   Continuing...');
  }

  console.log('');
  await monitorDeals();

  setInterval(async () => {
    await monitorDeals();
    cleanupCache();
  }, CHECK_INTERVAL);
}

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

start().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
