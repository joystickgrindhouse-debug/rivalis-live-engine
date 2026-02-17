#!/usr/bin/env node

/**
 * Rivalis Live - HTTP API Test Script
 * Tests session creation, management, and health endpoints
 * Run with: node API_TEST.js
 */

const http = require('http');

const LIVE_SERVER = 'http://localhost:8080';
const BOT_SERVER = 'http://localhost:5000';

/**
 * Make HTTP request
 */
function request(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Run tests
 */
async function runTests() {
  console.log('\n🧪 ===== RIVALIS LIVE - API TEST =====\n');

  try {
    // Test 1: Health check - Live Server
    console.log('📋 Test 1: Health Check - Live Server');
    const healthLive = await request(`${LIVE_SERVER}/health`);
    console.log('Status:', healthLive.status);
    console.log('Data:', JSON.stringify(healthLive.body, null, 2));
    console.log('✅ Live server is running\n');

    // Test 2: Health check - Discord Bot
    console.log('📋 Test 2: Health Check - Discord Bot');
    const healthBot = await request(`${BOT_SERVER}/health`);
    console.log('Status:', healthBot.status);
    console.log('Data:', JSON.stringify(healthBot.body, null, 2));
    console.log('✅ Bot server is running\n');

    // Test 3: Create session
    console.log('📋 Test 3: Create Session');
    const createSession = await request(`${LIVE_SERVER}/sessions`, 'POST', {});
    console.log('Status:', createSession.status);
    console.log('Data:', JSON.stringify(createSession.body, null, 2));
    
    if (createSession.status !== 200) {
      console.error('❌ Failed to create session');
      return;
    }

    const sessionId = createSession.body.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);

    // Test 4: Get session details
    console.log('📋 Test 4: Get Session Details');
    const getSession = await request(`${LIVE_SERVER}/sessions/${sessionId}`);
    console.log('Status:', getSession.status);
    console.log('Data:', JSON.stringify(getSession.body, null, 2));
    console.log('✅ Session retrieved\n');

    // Test 5: Start session
    console.log('📋 Test 5: Start Session');
    const startSession = await request(`${LIVE_SERVER}/sessions/${sessionId}/start`, 'POST', {});
    console.log('Status:', startSession.status);
    
    // Expected to fail (no players added)
    if (startSession.status >= 400) {
      console.log('⚠️ Expected error (no players):', JSON.stringify(startSession.body));
    } else {
      console.log('Data:', JSON.stringify(startSession.body, null, 2));
    }
    console.log('');

    // Test 6: Create voice channel for session
    console.log('📋 Test 6: Create Discord Voice Channel');
    const createVC = await request(`${BOT_SERVER}/create-vc`, 'POST', {
      sessionId,
      guildId: process.env.DISCORD_GUILD_ID,
    });
    console.log('Status:', createVC.status);
    
    if (createVC.status >= 400) {
      console.log('⚠️ Error creating channel:', JSON.stringify(createVC.body));
    } else {
      console.log('Data:', JSON.stringify(createVC.body, null, 2));
      console.log('✅ Voice channel created');
    }
    console.log('');

    // Test 7: Get active channels
    console.log('📋 Test 7: Get Active Discord Channels');
    const getChannels = await request(`${BOT_SERVER}/channels`);
    console.log('Status:', getChannels.status);
    console.log('Data:', JSON.stringify(getChannels.body, null, 2));
    console.log('');

    // Test 8: Delete voice channel
    console.log('📋 Test 8: Delete Discord Voice Channel');
    const deleteVC = await request(`${BOT_SERVER}/delete-vc`, 'POST', {
      sessionId,
    });
    console.log('Status:', deleteVC.status);
    
    if (deleteVC.status >= 400) {
      console.log('⚠️ Error deleting channel:', JSON.stringify(deleteVC.body));
    } else {
      console.log('Data:', JSON.stringify(deleteVC.body, null, 2));
      console.log('✅ Voice channel deleted');
    }
    console.log('');

    // Test 9: End session
    console.log('📋 Test 9: End Session');
    const endSession = await request(`${LIVE_SERVER}/sessions/${sessionId}/end`, 'POST', {});
    console.log('Status:', endSession.status);
    console.log('Data:', JSON.stringify(endSession.body, null, 2));
    console.log('✅ Session ended\n');

    console.log('✅ ===== ALL TESTS COMPLETED =====\n');
  } catch (error) {
    console.error('🔥 Test error:', error.message);
    console.log('\n❌ Make sure both servers are running:');
    console.log('  Terminal 1: cd live-server && npm start');
    console.log('  Terminal 2: cd discord-bot && npm start');
  }
}

// Run tests
runTests();
