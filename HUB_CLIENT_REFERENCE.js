/**
 * Hub Client - Quick Reference
 * Exact data structures for integrating with Rivalis Hub
 */

// ============================================================
// DATA STRUCTURE: Rep Submission (from Hub's MediaPipe)
// ============================================================

const exampleRepSubmission = {
  // REQUIRED: Exercise type
  exercise: 'pushups',  // Must be one of: pushups, squats, burpees, lunges, mountain_climbers,
                        //                  jumping_jacks, plank, crunches, leg_raises, glute_bridges,
                        //                  russian_twists, pike_pushups, plank_updowns, shoulder_taps,
                        //                  high_knees, calf_raises

  // REQUIRED: MediaPipe pose angles (8 values)
  angles: [
    293,    // 0: Left shoulder angle
    283,    // 1: Right shoulder angle
    50,     // 2: Left elbow angle
    46,     // 3: Right elbow angle
    84,     // 4: Left hip angle
    304,    // 5: Right hip angle
    135,    // 6: Left knee angle
    252,    // 7: Right knee angle
  ],

  // REQUIRED: MediaPipe distances (4 values)
  distances: [
    1476,   // 0: Left arm length
    null,   // 1: Right arm length (null if not tracked)
    1274,   // 2: Left leg length
    1193,   // 3: Right leg length
  ],

  // OPTIONAL: MediaPipe pose confidence (0-1)
  visibility: 0.79,

  // OPTIONAL: Time in milliseconds to complete this rep
  repTimeMs: 2150,

  // OPTIONAL: Unix timestamp in milliseconds
  timestamp: 1739607000000,  // or Date.now()

  // OPTIONAL: Hub's local form validation (0-1)
  formScore: 0.85,

  // OPTIONAL: Hub's local depth calculation (0-1)
  depth: 0.72,
};

// ============================================================
// MINIMAL EXAMPLE (only required fields)
// ============================================================

const minimalRepSubmission = {
  exercise: 'pushups',
  angles: [293, 283, 50, 46, 84, 304, 135, 252],
  distances: [1476, null, 1274, 1193],
};

// ============================================================
// HOW TO INTEGRATE: Step-by-step
// ============================================================

/**
 * STEP 1: In your Hub's MediaPipe detection code
 */
function onRepCompleted(mediapipeData) {
  // mediapipeData from your MediaPipe detector
  // e.g., { landmarks, exercise, confidence, repDuration, etc. }

  const repData = {
    exercise: mediapipeData.exerciseName || 'pushups',
    angles: mediapipeData.bodyParts.angles || [],
    distances: mediapipeData.bodyParts.distances || [],
    visibility: mediapipeData.poseConfidence || 0.5,
    repTimeMs: mediapipeData.repDuration || 1500,
    timestamp: Date.now(),
    formScore: mediapipeData.formScore || 0.7,
    depth: mediapipeData.depthScore || 0.7,
  };

  // Send to Live Server
  hubClient.submitRep(repData);
}

/**
 * STEP 2: Extract MediaPipe values correctly
 */

// MediaPipe landmarks (33 points)
// Body angles needed (8 values):
// [0] Left shoulder (upper arm angle)
// [1] Right shoulder
// [2] Left elbow
// [3] Right elbow
// [4] Left hip
// [5] Right hip
// [6] Left knee
// [7] Right knee

// Distances needed (4 values):
// [0] Left arm length (shoulder to wrist)
// [1] Right arm length
// [2] Left leg length (hip to ankle)
// [3] Right leg length

const mediapipeLandmarks = [
  { x: 0.5, y: 0.3, z: 0.0, visibility: 0.9 }, // 0: nose
  { x: 0.48, y: 0.25, z: 0.0, visibility: 0.95 }, // 1: left eye
  // ... 33 total landmarks
];

function extractAnglesAndDistances(landmarks) {
  // Calculate angles (in degrees)
  const angles = [
    calculateAngle(landmarks[11], landmarks[13], landmarks[15]), // Left shoulder
    calculateAngle(landmarks[12], landmarks[14], landmarks[16]), // Right shoulder
    calculateAngle(landmarks[11], landmarks[13], landmarks[15]), // Left elbow
    calculateAngle(landmarks[12], landmarks[14], landmarks[16]), // Right elbow
    calculateAngle(landmarks[23], landmarks[25], landmarks[27]), // Left hip
    calculateAngle(landmarks[24], landmarks[26], landmarks[28]), // Right hip
    calculateAngle(landmarks[25], landmarks[27], landmarks[29]), // Left knee
    calculateAngle(landmarks[26], landmarks[28], landmarks[30]), // Right knee
  ];

  // Calculate distances (in pixels)
  const distances = [
    calculateDistance(landmarks[11], landmarks[15]), // Left shoulder to left wrist
    calculateDistance(landmarks[12], landmarks[16]), // Right shoulder to right wrist
    calculateDistance(landmarks[23], landmarks[27]), // Left hip to left ankle
    calculateDistance(landmarks[24], landmarks[28]), // Right hip to right ankle
  ];

  // Extract max visibility
  const visibility = Math.min(...landmarks.map(l => l.visibility || 0.5));

  return { angles, distances, visibility };
}

function calculateAngle(p1, p2, p3) {
  // Calculate angle between 3 points (in degrees)
  const angle1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
  const angle2 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
  const angle = Math.abs((angle1 - angle2) * 180 / Math.PI);
  return Math.min(angle, 360 - angle);
}

function calculateDistance(p1, p2) {
  // Euclidean distance
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow((p2.z || 0) - (p1.z || 0), 2)
  );
}

// ============================================================
// INTEGRATION CHECKLIST
// ============================================================

/**
 * Before submitting a rep, ensure:
 * 
 * ✅ exercise = one of the 16 supported types
 * ✅ angles = array of 8 numbers (or null for missing joints)
 * ✅ distances = array of 4 numbers (or null for missing limbs)
 * ✅ visibility = 0-1 (MediaPipe confidence)
 * ✅ repTimeMs = actual duration milliseconds
 * ✅ timestamp = Date.now() or server time
 * ✅ formScore = 0-1 (your local validation)
 * ✅ depth = 0-1 (calculated from angles)
 */

function validateRepData(repData) {
  const errors = [];

  if (!repData.exercise) {
    errors.push('exercise is required');
  }

  if (!Array.isArray(repData.angles) || repData.angles.length !== 8) {
    errors.push('angles must be array of 8 values');
  }

  if (!Array.isArray(repData.distances) || repData.distances.length !== 4) {
    errors.push('distances must be array of 4 values');
  }

  if (typeof repData.visibility !== 'number' || repData.visibility < 0 || repData.visibility > 1) {
    errors.push('visibility must be 0-1');
  }

  if (typeof repData.formScore === 'number' && (repData.formScore < 0 || repData.formScore > 1)) {
    errors.push('formScore must be 0-1');
  }

  if (typeof repData.depth === 'number' && (repData.depth < 0 || repData.depth > 1)) {
    errors.push('depth must be 0-1');
  }

  return errors;
}

// ============================================================
// SUPPORTED EXERCISES (16 total)
// ============================================================

const SUPPORTED_EXERCISES = [
  'pushups',
  'squats',
  'burpees',
  'lunges',
  'mountain_climbers',
  'jumping_jacks',
  'plank',
  'crunches',
  'leg_raises',
  'glute_bridges',
  'russian_twists',
  'pike_pushups',
  'plank_updowns',
  'shoulder_taps',
  'high_knees',
  'calf_raises',
];

function isValidExercise(exerciseName) {
  return SUPPORTED_EXERCISES.includes(exerciseName);
}

// ============================================================
// COMPLETE EXAMPLE: Hub Multiplayer Integration
// ============================================================

class HubMultiplayerIntegration {
  constructor(hubClient) {
    this.client = hubClient;
    this.inSession = false;
    this.currentExercise = null;
  }

  // Called by Hub's MediaPipe system when rep is detected
  onRepDetected(mediapipeOutput) {
    if (!this.inSession) {
      console.log('Not in session - ignoring rep');
      return;
    }

    // Extract data from MediaPipe
    const { angles, distances, visibility } = extractAnglesAndDistances(mediapipeOutput.landmarks);

    // Build rep submission
    const repData = {
      exercise: mediapipeOutput.detectedExercise,
      angles,
      distances,
      visibility,
      repTimeMs: mediapipeOutput.duration || 1500,
      timestamp: Date.now(),
      formScore: mediapipeOutput.formQuality || 0.7,
      depth: mediapipeOutput.depthQuality || 0.7,
    };

    // Validate before sending
    const validationErrors = validateRepData(repData);
    if (validationErrors.length > 0) {
      console.error('Invalid rep data:', validationErrors);
      return;
    }

    // Send to server
    console.log(`Submitting ${repData.exercise} rep...`);
    this.client.submitRep(repData);

    // Listen for result
    this.client.once('repProcessed', (result) => {
      if (result.isValid) {
        console.log(`✅ Valid! +${result.repsAdded} reps, +${result.scoreAdded} points`);
        this.showHubFeedback('Rep accepted!', 'success');
      } else {
        console.log(`❌ Invalid: ${result.reason}`);
        this.showHubFeedback(`Rep rejected: ${result.reason}`, 'error');
      }
    });
  }

  joinSession(sessionId) {
    this.inSession = true;
    this.client.joinSession(sessionId);

    this.client.on('sessionStarted', (data) => {
      this.currentExercise = data.currentExercise;
      this.showHubFeedback(`Start ${this.currentExercise}!`, 'info');
    });

    this.client.on('turnAdvanced', (data) => {
      this.currentExercise = data.currentExercise;
      this.showHubFeedback(`Now: ${this.currentExercise}`, 'info');
    });

    this.client.on('sessionEnded', () => {
      this.inSession = false;
      this.showHubFeedback('Game ended', 'info');
    });
  }

  showHubFeedback(message, type) {
    // Update Hub UI
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
  exampleRepSubmission,
  minimalRepSubmission,
  extractAnglesAndDistances,
  calculateAngle,
  calculateDistance,
  validateRepData,
  isValidExercise,
  SUPPORTED_EXERCISES,
  HubMultiplayerIntegration,
};
