require('dotenv').config();
const cheerio = require('cheerio');
const https = require('https');

// Check Node version
if (process.version.split('.')[0].replace('v', '') < 18) {
  console.error('❌ ERROR: Node.js 18 or higher required');
  console.error('   Current version:', process.version);
  process.exit(1);
}

// Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const CHECK_INTERVAL = 3600000; // Check every 1 hour (60 * 60 * 1000 ms)
const UPVOTE_THRESHOLD = 50;
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 3;
// Note: Direct scraping gets recent deals from homepage (OzBargain naturally shows recent deals)

// Validate configuration
if (!TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN === 'your_bot_token_here') {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN is not set!');
  process.exit(1);
}

if (!TELEGRAM_CHANNEL_ID || TELEGRAM_CHANNEL_ID === '@yourchannel') {
  console.error('❌ ERROR: TELEGRAM_CHANNEL_ID is not set!');
  process.exit(1);
}

const notifiedPosts = new Set();
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * HTTPS request helper with proper Node.js agent
 */
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
      timeout: options.timeout || REQUEST_TIMEOUT,
      // Force IPv4 to avoid IPv6 issues
      family: 4
    };
    
    if (isPost && options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      const err = new Error('Request timeout');
      err.code = 'ETIMEDOUT';
      reject(err);
    });
    
    if (isPost && options.body) {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(bodyStr);
    }
    
    req.end();
  });
}

/**
 * Telegram API - Get bot info
 */
async function telegramGetMe() {
  try {
    const response = await httpsRequest(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`,
      { timeout: REQUEST_TIMEOUT }
    );
    
    const data = JSON.parse(response.data);
    
    if (data.ok) {
      return data.result;
    } else {
      throw new Error(data.description || 'Failed to get bot info');
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Telegram API - Send message
 */
async function telegramSendMessage(chatId, text, options = {}) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: options.parse_mode || 'Markdown',
      disable_web_page_preview: options.disable_web_page_preview || false
    };
    
    const response = await httpsRequest(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        body: payload,
        timeout: REQUEST_TIMEOUT
      }
    );
    
    const data = JSON.parse(response.data);
    
    if (!data.ok) {
      const error = new Error(data.description || 'Failed to send message');
      error.response = { statusCode: response.statusCode };
      error.code = data.error_code;
      throw error;
    }
    
    return data.result;
  } catch (error) {
    throw error;
  }
}

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await sleep(waitTime);
  }
  
  lastRequestTime = Date.now();
}

async function scrapeOzBargain() {
  await rateLimit();
  
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
      ];
      
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      
      const response = await httpsRequest('https://www.ozbargain.com.au/', {
        headers: {
          'User-Agent': randomUserAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'DNT': '1',
          'Connection': 'keep-alive'
        },
        timeout: REQUEST_TIMEOUT
      });

      if (response.statusCode === 403) {
        console.warn(`⚠️  403 Forbidden (attempt ${retries + 1}/${MAX_RETRIES})`);
        retries++;
        if (retries < MAX_RETRIES) {
          await sleep(5000 * Math.pow(2, retries - 1));
          continue;
        }
        return [];
      }

      if (response.statusCode !== 200) {
        console.error(`❌ Status code: ${response.statusCode}`);
        return [];
      }

      const $ = cheerio.load(response.data);
      const deals = [];

      $('.node-ozbdeal').each((index, element) => {
        const $deal = $(element);
        
        const dealId = $deal.attr('id')?.replace('node-', '') || '';
        const title = $deal.find('.title a').first().text().trim();
        const url = $deal.find('.title a').first().attr('href');
        const fullUrl = url?.startsWith('http') ? url : `https://www.ozbargain.com.au${url}`;
        
        const upvoteText = $deal.find('.voteup .nvb').text().trim();
        const upvotes = parseInt(upvoteText) || 0;
        
        const price = $deal.find('.foxshot-container .isave').text().trim() || 'N/A';
        const merchant = $deal.find('.foxshot-container .submitted a').first().text().trim() || 'Unknown';
        const category = $deal.find('.taxonomy a').first().text().trim() || 'General';

        if (dealId && title) {
          deals.push({ id: dealId, title, url: fullUrl, upvotes, price, merchant, category });
        }
      });

      console.log(`✓ Scraped ${deals.length} deals`);
      return deals;

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      retries++;
      
      if (retries < MAX_RETRIES) {
        await sleep(5000 * Math.pow(2, retries - 1));
      } else {
        return [];
      }
    }
  }
  
  return [];
}

async function sendNotification(deal) {
  // Escape ALL special characters for MarkdownV2
  const escapeMarkdown = (text) => {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
  };
  
  const message = `
🔥 *Hot Deal Alert\\!* 🔥

*${escapeMarkdown(deal.title)}*

💰 Price: ${escapeMarkdown(deal.price)}
🏪 Store: ${escapeMarkdown(deal.merchant)}
📁 Category: ${escapeMarkdown(deal.category)}
👍 Upvotes: *${deal.upvotes}*

🔗 [View Deal](${deal.url})
  `.trim();

  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      await telegramSendMessage(TELEGRAM_CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: false
      });
      console.log(`✓ Notification sent: ${deal.title}`);
      return;
    } catch (error) {
      retries++;
      console.error(`⚠️  Error (attempt ${retries}/${maxRetries}):`, error.message);
      
      if (retries < maxRetries) {
        await sleep(5000 * retries);
        continue;
      }
      
      console.error('❌ Failed to send notification after all retries');
    }
  }
}

async function monitorDeals() {
  console.log(`🔍 Checking for deals with ${UPVOTE_THRESHOLD}+ upvotes...`);
  
  const deals = await scrapeOzBargain();
  
  console.log(`   Found ${deals.length} deals total`);
  
  let hotDeals = deals.filter(d => d.upvotes >= UPVOTE_THRESHOLD);
  console.log(`   ${hotDeals.length} deals have ${UPVOTE_THRESHOLD}+ upvotes`);
  
  for (const deal of deals) {
    console.log(`   Deal ${deal.id}: "${deal.title.substring(0, 40)}..." - ${deal.upvotes} upvotes`);
    
    if (deal.upvotes >= UPVOTE_THRESHOLD && !notifiedPosts.has(deal.id)) {
      console.log(`   📢 SENDING: ${deal.title} (${deal.upvotes} upvotes)`);
      await sendNotification(deal);
      notifiedPosts.add(deal.id);
    } else if (deal.upvotes >= UPVOTE_THRESHOLD) {
      console.log(`   ⏭️  Already notified about deal ${deal.id}`);
    } else {
      console.log(`   ⏭️  Not enough upvotes (${deal.upvotes}/${UPVOTE_THRESHOLD})`);
    }
  }
  
  console.log(`✓ Complete. Found ${deals.length} deals, tracking ${notifiedPosts.size} total.`);
}

function cleanupNotifiedPosts() {
  if (notifiedPosts.size > 1000) {
    const toRemove = Array.from(notifiedPosts).slice(0, notifiedPosts.size - 1000);
    toRemove.forEach(id => notifiedPosts.delete(id));
  }
}

async function start() {
  console.log('🤖 OzBargain Bot Started');
  console.log(`📊 Channel: ${TELEGRAM_CHANNEL_ID}`);
  console.log(`📊 Threshold: ${UPVOTE_THRESHOLD} upvotes`);
  console.log(`⏰ Check Interval: ${CHECK_INTERVAL / 60000} minutes (${CHECK_INTERVAL / 3600000} hour)`);
  console.log('');

  console.log('🔐 Testing Telegram...');
  try {
    const botInfo = await telegramGetMe();
    console.log(`✓ Connected as @${botInfo.username}`);
  } catch (error) {
    console.error('❌ Telegram connection failed:', error.message);
    console.error('   Check: 1) Bot token 2) Internet 3) DNS settings');
    process.exit(1);
  }

  console.log('📢 Testing channel...');
  try {
    await telegramSendMessage(TELEGRAM_CHANNEL_ID, '🤖 Bot started!');
    console.log('✓ Test message sent');
  } catch (error) {
    console.error('❌ Channel test failed:', error.message);
    console.error('   Continuing anyway...');
  }

  console.log('');
  await monitorDeals();

  setInterval(async () => {
    await monitorDeals();
    cleanupNotifiedPosts();
  }, CHECK_INTERVAL);
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

start().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
