/**
 * PWA Integration Guide for Rivalis Hub
 * Shows how to use RivalisHubClientBrowser in your PWA
 */

// ============================================================
// SETUP: Import the client in your PWA
// ============================================================

// 1. Add to your HTML:
/*
<script src="./hub-client-browser.js"></script>
*/

// 2. Or import as module (if using ES6):
// import RivalisHubClientBrowser from './hub-client-browser.js';

// ============================================================
// EXAMPLE 1: Initialize the client
// ============================================================

async function initializeHubClient() {
  const client = new RivalisHubClientBrowser({
    serverUrl: 'ws://localhost:8080', // Change to your server
    userId: localStorage.getItem('userId') || 'hub-user-' + Date.now(),
    firebaseToken: localStorage.getItem('firebaseToken'),
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,
  });

  // Listen for basic events
  client.on('connected', () => {
    console.log('✅ Connected to Live Server');
    updateUI({ status: 'Connected' });
  });

  client.on('disconnected', () => {
    console.log('❌ Disconnected');
    updateUI({ status: 'Disconnected' });
  });

  client.on('error', (error) => {
    console.error('⚠️ Error:', error.message);
    updateUI({ status: 'Error: ' + error.message });
  });

  // Connect to server
  try {
    await client.connect();
  } catch (error) {
    console.error('Failed to connect:', error);
  }

  return client;
}

// ============================================================
// EXAMPLE 2: Hub Game Manager for PWA
// ============================================================

class HubGameManagerPWA {
  constructor() {
    this.client = null;
    this.mediapipeCtx = null;
    this.isRecording = false;
    this.currentSession = null;
  }

  async initialize() {
    this.client = await initializeHubClient();
    this.setupEventListeners();
    return this.client;
  }

  setupEventListeners() {
    // Session joined
    this.client.on('sessionJoined', (data) => {
      console.log('✅ Joined session:', data.sessionId);
      this.currentSession = data;
      this.updateGameUI('Session started with ' + data.players.length + ' players');
    });

    // Game started
    this.client.on('sessionStarted', (data) => {
      console.log('🎮 Game started! Exercise:', data.currentExercise);
      this.updateGameUI(`Start ${data.currentExercise}!`);
      this.startExerciseMonitoring(data.currentExercise);
    });

    // Rep processed
    this.client.on('repProcessed', (result) => {
      if (result.isValid) {
        this.showRepFeedback(
          `✅ Valid!\n+${result.repsAdded} reps\n+${result.scoreAdded} points`,
          'success'
        );
      } else {
        this.showRepFeedback(`❌ ${result.reason}`, 'error');
      }
    });

    // Turn advanced
    this.client.on('turnAdvanced', (data) => {
      console.log('➡️ Turn advanced. New exercise:', data.currentExercise);
      this.updateGameUI(`Now: ${data.currentExercise}`);
      this.startExerciseMonitoring(data.currentExercise);
    });

    // Leaderboard updated
    this.client.on('leaderboardUpdated', (leaderboard) => {
      console.log('📊 Leaderboard:', leaderboard);
      this.updateLeaderboard(leaderboard);
    });

    // Game ended
    this.client.on('sessionEnded', (data) => {
      console.log('🏆 Game ended! Winner:', data.winner);
      this.updateGameUI('Game ended!');
      this.showGameResults(data);
    });

    // Card drawn
    this.client.on('cardDrawn', (data) => {
      console.log('🎴 Card drawn:', data.cardName);
      this.showCardNotification(data);
    });

    // Player eliminated
    this.client.on('playerEliminated', (data) => {
      console.log(`⚠️ ${data.playerName} eliminated`);
      this.showNotification(`${data.playerName} eliminated!`);
    });
  }

  // ============================================================
  // MEDIA PIPE INTEGRATION
  // ============================================================

  async startExerciseMonitoring(exerciseName) {
    console.log(`[HubGame] Monitoring: ${exerciseName}`);

    // Initialize MediaPipe Pose (your Hub's implementation)
    if (!this.mediapipeCtx) {
      this.mediapipeCtx = await initializeMediaPipe();
    }

    // Start video stream
    const video = document.getElementById('video-input');
    if (!video) {
      console.error('Video element not found. Add: <video id="video-input"></video>');
      return;
    }

    // Get camera access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      video.srcObject = stream;
    } catch (error) {
      console.error('Camera access denied:', error);
      this.showNotification('Camera permission required');
      return;
    }

    // Process video frames
    this.isRecording = true;
    this.processVideoFrames(exerciseName);
  }

  async processVideoFrames(exerciseName) {
    const video = document.getElementById('video-input');
    const canvas = document.getElementById('canvas-pose');

    if (!this.isRecording) return;

    try {
      // Your MediaPipe pose detection here
      // This should detect exercise completion and extract:
      // - angles (8 values)
      // - distances (4 values)
      // - visibility (0-1)
      // - repDuration (ms)

      const results = await detectPose(video, exerciseName);

      if (results && results.repCompleted) {
        // Rep detected! Send to server
        const repData = {
          exercise: exerciseName,
          angles: results.angles,           // From MediaPipe
          distances: results.distances,     // From MediaPipe
          visibility: results.visibility,   // From MediaPipe
          repTimeMs: results.duration,      // Time to complete rep
          timestamp: Date.now(),
          formScore: results.formScore,     // Your Hub's validation
          depth: results.depthScore,        // Your Hub's validation
        };

        console.log(`[HubGame] Submitting ${exerciseName} rep:`, repData);
        this.client.submitRep(repData);

        // Draw pose on canvas for visual feedback
        if (canvas) {
          const ctx = canvas.getContext('2d');
          drawPose(ctx, results.landmarks);
        }
      }

      // Continue processing
      requestAnimationFrame(() => this.processVideoFrames(exerciseName));
    } catch (error) {
      console.error('Error processing frame:', error);
      requestAnimationFrame(() => this.processVideoFrames(exerciseName));
    }
  }

  async stopExerciseMonitoring() {
    this.isRecording = false;
    const video = document.getElementById('video-input');
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  }

  // ============================================================
  // GAME FLOW
  // ============================================================

  joinGame(sessionId) {
    console.log('Joining session:', sessionId);
    this.client.joinSession(sessionId);
  }

  leaveGame() {
    this.stopExerciseMonitoring();
    this.client.leaveSession();
  }

  // ============================================================
  // UI UPDATES
  // ============================================================

  updateGameUI(message) {
    const element = document.getElementById('game-status');
    if (element) {
      element.textContent = message;
    }
  }

  showRepFeedback(message, type = 'info') {
    const element = document.getElementById('rep-feedback');
    if (element) {
      element.textContent = message;
      element.className = `feedback ${type}`;
      element.style.display = 'block';
      setTimeout(() => {
        element.style.display = 'none';
      }, 2000);
    }
  }

  updateLeaderboard(leaderboard) {
    const element = document.getElementById('leaderboard');
    if (!element) return;

    let html = '<h3>Leaderboard</h3><ol>';
    leaderboard.forEach((entry, index) => {
      html += `<li>${entry.playerId}: ${entry.sessionScore} pts (${entry.totalReps} reps)</li>`;
    });
    html += '</ol>';
    element.innerHTML = html;
  }

  showCardNotification(cardData) {
    const element = document.getElementById('card-notification');
    if (element) {
      element.innerHTML = `
        <h4>🎴 ${cardData.cardName}</h4>
        <p>${cardData.effect}</p>
      `;
      element.style.display = 'block';
      setTimeout(() => {
        element.style.display = 'none';
      }, 3000);
    }
  }

  showGameResults(data) {
    const element = document.getElementById('game-results');
    if (element) {
      element.innerHTML = `
        <h2>🏆 Game Over!</h2>
        <h3>Winner: ${data.winner}</h3>
        <h4>Final Leaderboard:</h4>
        <ul>
          ${data.finalLeaderboard
            .map((p, i) => `<li>${i + 1}. ${p.playerId}: ${p.sessionScore} pts</li>`)
            .join('')}
        </ul>
      `;
      element.style.display = 'block';
    }
  }

  showNotification(message) {
    console.log('[Notification]', message);
    // Use browser notification API if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Rivalis Live', { body: message });
    }
    // Or show in UI
    const element = document.getElementById('notification');
    if (element) {
      element.textContent = message;
      element.style.display = 'block';
      setTimeout(() => {
        element.style.display = 'none';
      }, 3000);
    }
  }

  updateUI(data) {
    if (data.status) {
      const element = document.getElementById('connection-status');
      if (element) {
        element.textContent = data.status;
        element.className = data.status.includes('Connected') ? 'connected' : 'disconnected';
      }
    }
  }
}

// ============================================================
// HELPER FUNCTIONS (implement in your Hub)
// ============================================================

async function initializeMediaPipe() {
  // Your Hub's MediaPipe initialization
  console.log('[MediaPipe] Initializing...');
  // This should return a context/instance for pose detection
  return {};
}

async function detectPose(video, exerciseName) {
  // Your Hub's pose detection logic
  // Should return:
  // {
  //   repCompleted: boolean,
  //   angles: [8 numbers],
  //   distances: [4 numbers],
  //   visibility: number (0-1),
  //   duration: number (ms),
  //   formScore: number (0-1),
  //   depthScore: number (0-1),
  //   landmarks: [...] // For drawing
  // }
  return null;
}

function drawPose(ctx, landmarks) {
  // Your Hub's pose drawing logic
  // Draw MediaPipe skeleton on canvas
}

// ============================================================
// GLOBAL INSTANCE
// ============================================================

let hubGameManager = null;

async function startGame(sessionId) {
  if (!hubGameManager) {
    hubGameManager = new HubGameManagerPWA();
    await hubGameManager.initialize();
  }
  hubGameManager.joinGame(sessionId);
}

function stopGame() {
  if (hubGameManager) {
    hubGameManager.leaveGame();
  }
}

// ============================================================
// EXPORT
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HubGameManagerPWA,
    initializeHubClient,
    startGame,
    stopGame,
  };
}
