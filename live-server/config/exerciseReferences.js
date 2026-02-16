/**
 * Exercise Reference Manager
 * Loads and serves master pose references for all exercises
 * Used for real-time form validation and scoring
 */

const fs = require('fs');
const path = require('path');

class ExerciseReferences {
  constructor() {
    this.references = {};
    this.exerciseNames = [];
    this.loaded = false;
  }

  /**
   * Load all exercise reference JSONs into memory
   */
  loadReferences() {
    try {
      const rootPath = path.join(__dirname, '../../');
      const exerciseFiles = [
        'pushups.json',
        'crunches.json',
        'squats.json',
        'lunges.json',
        'burpees.json',
        'mountain_climbers.json',
        'jumping_jacks.json',
        'high_knees.json',
        'leg_raises.json',
        'plank.json',
        'plank_updowns.json',
        'russian_twists.json',
        'shoulder_taps.json',
        'glute_bridges.json',
        'pike_pushups.json',
        'calf_raises.json',
      ];

      for (const file of exerciseFiles) {
        const filePath = path.join(rootPath, file);
        if (fs.existsSync(filePath)) {
          const rawData = fs.readFileSync(filePath);
          const data = JSON.parse(rawData);
          const exerciseName = data.exercise || file.replace('.json', '');
          this.references[exerciseName] = data;
          this.exerciseNames.push(exerciseName);
          console.log(`[ExerciseRef] ✅ Loaded: ${exerciseName}`);
        }
      }

      this.loaded = true;
      console.log(`[ExerciseRef] ✅ All ${this.exerciseNames.length} exercises loaded`);
      return true;
    } catch (error) {
      console.error('[ExerciseRef] Failed to load references:', error.message);
      this.loaded = false;
      return false;
    }
  }

  /**
   * Get reference for a specific exercise
   */
  getReference(exerciseName) {
    return this.references[exerciseName] || null;
  }

  /**
   * Get all available exercises
   */
  getAvailableExercises() {
    return this.exerciseNames;
  }

  /**
   * Get summary of an exercise
   */
  getExerciseSummary(exerciseName) {
    const ref = this.references[exerciseName];
    if (!ref) return null;

    return {
      exercise: ref.exercise,
      fps: ref.fps,
      maxSec: ref.maxSec,
      modelComplexity: ref.modelComplexity,
      minDetectionConfidence: ref.minDetectionConfidence,
      minTrackingConfidence: ref.minTrackingConfidence,
      frameCount: ref.frames ? ref.frames.length : 0,
      angles_scale: ref.angles_scale,
      dists_scale: ref.dists_scale,
    };
  }

  /**
   * Get reference frame at a specific time
   * Used for comparing against live pose data
   */
  getReferenceFrameAtTime(exerciseName, timeSeconds) {
    const ref = this.references[exerciseName];
    if (!ref || !ref.frames) return null;

    // Find the frame closest to the requested time
    let closestFrame = ref.frames[0];
    let minDiff = Math.abs(closestFrame.t - timeSeconds);

    for (const frame of ref.frames) {
      const diff = Math.abs(frame.t - timeSeconds);
      if (diff < minDiff) {
        minDiff = diff;
        closestFrame = frame;
      }
    }

    return closestFrame;
  }

  /**
   * Get all frames for an exercise
   */
  getFrames(exerciseName) {
    const ref = this.references[exerciseName];
    return ref ? ref.frames : [];
  }

  /**
   * Compare live pose to reference and calculate form score
   * Returns score 0-100
   */
  scoreFormAccuracy(exerciseName, liveFrame, referenceFrame) {
    if (!referenceFrame || !liveFrame) return 50; // Default neutral score

    try {
      const ref = this.references[exerciseName];
      if (!ref) return 50;

      let matchScore = 100;
      let matchedAngles = 0;
      let matchedDistances = 0;

      // Compare angles (aQ)
      if (referenceFrame.aQ && liveFrame.aQ) {
        const angleThreshold = 15; // degrees tolerance
        for (let i = 0; i < referenceFrame.aQ.length; i++) {
          if (referenceFrame.aQ[i] !== null && liveFrame.aQ[i] !== null) {
            const refAngle = referenceFrame.aQ[i] / ref.angles_scale;
            const liveAngle = liveFrame.aQ[i] / ref.angles_scale;
            const angleDiff = Math.abs(refAngle - liveAngle);
            
            if (angleDiff <= angleThreshold) {
              matchedAngles++;
            } else {
              // Penalize based on how far off
              const penalty = Math.min(20, (angleDiff / angleThreshold) * 5);
              matchScore -= penalty;
            }
          }
        }
      }

      // Compare distances (dQ)
      if (referenceFrame.dQ && liveFrame.dQ) {
        const distThreshold = 50; // pixels tolerance
        for (let i = 0; i < referenceFrame.dQ.length; i++) {
          if (referenceFrame.dQ[i] !== null && liveFrame.dQ[i] !== null) {
            const refDist = referenceFrame.dQ[i] / ref.dists_scale;
            const liveDist = liveFrame.dQ[i] / ref.dists_scale;
            const distDiff = Math.abs(refDist - liveDist);
            
            if (distDiff <= distThreshold) {
              matchedDistances++;
            } else {
              // Penalize based on how far off
              const penalty = Math.min(15, (distDiff / distThreshold) * 3);
              matchScore -= penalty;
            }
          }
        }
      }

      // Check visibility (visQ)
      if (referenceFrame.visQ && liveFrame.visQ) {
        const visThreshold = 10; // visibility tolerance
        const visDiff = Math.abs(referenceFrame.visQ - liveFrame.visQ);
        if (visDiff > visThreshold) {
          const penalty = Math.min(10, (visDiff / visThreshold) * 2);
          matchScore -= penalty;
        }
      }

      // Ensure score is between 0 and 100
      return Math.max(0, Math.min(100, Math.round(matchScore)));
    } catch (error) {
      console.error('[ExerciseRef] Error scoring form:', error.message);
      return 50;
    }
  }

  /**
   * Get key landmarks for an exercise
   * Returns indices of important angles/distances to check
   */
  getKeyLandmarks(exerciseName) {
    // This would be customized per exercise
    // For now, return generic indices
    return {
      primaryAngles: [0, 1, 2, 3], // indices in aQ array
      primaryDistances: [0, 1, 2, 3], // indices in dQ array
    };
  }
}

// Singleton instance
const exerciseReferences = new ExerciseReferences();

// Load on startup
if (!exerciseReferences.loaded) {
  exerciseReferences.loadReferences();
}

module.exports = exerciseReferences;
