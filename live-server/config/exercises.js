/**
 * Exercise Registry - Loads all exercise reference data
 * Provides normalized metadata for pose validation and rep evaluation
 */

const fs = require('fs');
const path = require('path');

// Exercise list (16 total)
const EXERCISE_LIST = [
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
  'calf_raises'
];

// Cache for loaded exercise data
const exerciseCache = {};

/**
 * Load exercise reference data from JSON files in workspace root
 * Returns { frames, metadata, thresholds }
 */
function loadExerciseData(exerciseName) {
  if (exerciseCache[exerciseName]) {
    return exerciseCache[exerciseName];
  }

  try {
    const filePath = path.join(__dirname, '../../', `${exerciseName}.json`);
    const rawData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(rawData);

    // Extract reference metadata
    const exerciseData = {
      name: exerciseName,
      version: jsonData.v || 1,
      fps: jsonData.fps || 10,
      maxDurationSeconds: jsonData.maxSec || 60,
      modelComplexity: jsonData.modelComplexity || 1,
      
      // Detection/tracking confidence requirements
      minDetectionConfidence: jsonData.minDetectionConfidence || 0.8,
      minTrackingConfidence: jsonData.minTrackingConfidence || 0.8,
      
      // Normalization scales for angle/distance comparisons
      anglesScale: jsonData.angles_scale || 100,
      distancesScale: jsonData.dists_scale || 1000,
      
      // Reference frames for pose validation
      frames: jsonData.frames || [],
      
      // Exercise-specific thresholds
      thresholds: getExerciseThresholds(exerciseName),
    };

    // Cache it
    exerciseCache[exerciseName] = exerciseData;
    return exerciseData;
  } catch (error) {
    console.error(`Failed to load exercise data for ${exerciseName}:`, error.message);
    return null;
  }
}

/**
 * Get exercise-specific validation thresholds
 * Different exercises have different biomechanical requirements
 */
function getExerciseThresholds(exerciseName) {
  const baseThresholds = {
    minFormScore: 0.5,           // Minimum form quality (0-1)
    minDepth: 0.6,               // Minimum depth of motion (0-1)
    maxRepTimeMs: 3000,          // Max time per rep (ms)
    minRepTimeMs: 800,           // Min time per rep (ms)
    visibilityThreshold: 0.7,    // Minimum pose visibility confidence
    poseMatchThreshold: 0.75,    // How similar to reference frames must be
  };

  // Exercise-specific overrides (biomechanical profile)
  const overrides = {
    pushups: {
      maxRepTimeMs: 3500,        // Pushups slower
      minFormScore: 0.65,        // Need good form
      poseMatchThreshold: 0.80,
    },
    squats: {
      minDepth: 0.75,            // Deep squats required
      maxRepTimeMs: 2500,        // Usually faster
      minFormScore: 0.60,
    },
    burpees: {
      maxRepTimeMs: 4000,        // Complex movement, slower
      minFormScore: 0.70,        // Multi-step, high skill
      poseMatchThreshold: 0.82,
    },
    lunges: {
      minDepth: 0.70,            // Decent depth needed
      maxRepTimeMs: 3000,
      minFormScore: 0.65,
    },
    mountain_climbers: {
      minRepTimeMs: 600,         // Fast movement
      maxRepTimeMs: 2000,        // Can't be too slow
      minFormScore: 0.60,
    },
    jumping_jacks: {
      minRepTimeMs: 500,         // Fast
      maxRepTimeMs: 1500,
      minFormScore: 0.55,
    },
    plank: {
      maxRepTimeMs: 5000,        // Endurance, can be longer
      minFormScore: 0.75,        // Form critical
      poseMatchThreshold: 0.85,
    },
    crunches: {
      maxRepTimeMs: 2500,
      minDepth: 0.70,            // Need visible ab activation
      minFormScore: 0.60,
    },
    leg_raises: {
      minDepth: 0.80,            // High leg lift required
      maxRepTimeMs: 3000,
      minFormScore: 0.70,
    },
    glute_bridges: {
      maxRepTimeMs: 3000,
      minFormScore: 0.65,
      poseMatchThreshold: 0.78,
    },
    russian_twists: {
      minRepTimeMs: 700,
      maxRepTimeMs: 2500,
      minFormScore: 0.60,
      poseMatchThreshold: 0.75,
    },
    pike_pushups: {
      maxRepTimeMs: 4000,        // Complex, slower
      minFormScore: 0.75,        // High difficulty
      poseMatchThreshold: 0.83,
    },
    plank_updowns: {
      maxRepTimeMs: 3500,
      minFormScore: 0.70,        // Form critical
      poseMatchThreshold: 0.80,
    },
    shoulder_taps: {
      minRepTimeMs: 600,         // Fast
      maxRepTimeMs: 2000,
      minFormScore: 0.60,
    },
    high_knees: {
      minRepTimeMs: 500,         // Very fast
      maxRepTimeMs: 1500,
      minFormScore: 0.55,
    },
    calf_raises: {
      maxRepTimeMs: 2000,        // Simple, faster
      minFormScore: 0.55,
      poseMatchThreshold: 0.70,  // Less stringent
    },
  };

  return { ...baseThresholds, ...(overrides[exerciseName] || {}) };
}

/**
 * Get all available exercises
 */
function getAllExercises() {
  return EXERCISE_LIST;
}

/**
 * Validate exercise name
 */
function isValidExercise(exerciseName) {
  return EXERCISE_LIST.includes(exerciseName);
}

/**
 * Get exercise reference frames (for pose comparison)
 */
function getExerciseFrames(exerciseName) {
  const data = loadExerciseData(exerciseName);
  return data ? data.frames : [];
}

/**
 * Get exercise metadata (fps, scales, etc)
 */
function getExerciseMetadata(exerciseName) {
  const data = loadExerciseData(exerciseName);
  return data ? {
    fps: data.fps,
    maxDurationSeconds: data.maxDurationSeconds,
    anglesScale: data.anglesScale,
    distancesScale: data.distancesScale,
    minDetectionConfidence: data.minDetectionConfidence,
    minTrackingConfidence: data.minTrackingConfidence,
  } : null;
}

/**
 * Get thresholds for an exercise
 */
function getThresholds(exerciseName) {
  const data = loadExerciseData(exerciseName);
  return data ? data.thresholds : null;
}

/**
 * Initialize all exercises (pre-cache on startup)
 */
function initializeExercises() {
  let loaded = 0;
  let failed = 0;

  EXERCISE_LIST.forEach(exerciseName => {
    if (loadExerciseData(exerciseName)) {
      loaded++;
    } else {
      failed++;
    }
  });

  console.log(`[Exercises] Initialized ${loaded}/${EXERCISE_LIST.length} exercises`);
  if (failed > 0) {
    console.warn(`[Exercises] Failed to load ${failed} exercises`);
  }

  return loaded === EXERCISE_LIST.length;
}

module.exports = {
  getAllExercises,
  isValidExercise,
  getExerciseFrames,
  getExerciseMetadata,
  getThresholds,
  loadExerciseData,
  initializeExercises,
};
