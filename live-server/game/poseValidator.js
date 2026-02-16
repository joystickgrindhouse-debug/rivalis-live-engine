/**
 * Pose Validator - Compares user pose data against exercise reference frames
 * Calculates form quality and depth metrics for rep validation
 */

const exercisesConfig = require('../config/exercises');
const exerciseReferences = require('../config/exerciseReferences');

/**
 * Validate a single rep against exercise reference data
 * Returns { formScore, depth, visibility, isValid, reason }
 */
function validateRepForm(repData, exerciseName) {
  // Validate exercise exists
  if (!exercisesConfig.isValidExercise(exerciseName)) {
    return {
      formScore: 0,
      depth: 0,
      visibility: 0,
      isValid: false,
      reason: `Unknown exercise: ${exerciseName}`,
    };
  }

  // Ensure rep has pose data
  if (!repData || typeof repData !== 'object') {
    return {
      formScore: 0,
      depth: 0,
      visibility: 0,
      isValid: false,
      reason: 'Invalid rep data',
    };
  }

  const { angles, distances, visibility } = repData;
  const thresholds = exercisesConfig.getThresholds(exerciseName);
  const referenceFrames = exercisesConfig.getExerciseFrames(exerciseName);

  if (!thresholds || !referenceFrames || referenceFrames.length === 0) {
    return {
      formScore: 0,
      depth: 0,
      visibility: 0,
      isValid: false,
      reason: `No reference data for exercise: ${exerciseName}`,
    };
  }

  // Try to get form score using master reference frames
  let formScore = 0;
  const masterReference = exerciseReferences.getReference(exerciseName);
  
  if (masterReference && repData.frames && repData.frames.length > 0) {
    // Use master reference for enhanced form scoring
    formScore = scoreLiveFormAgainstReference(
      exerciseName, 
      repData, 
      masterReference
    );
  } else {
    // Fallback to original calculation
    formScore = calculateFormScore(angles, distances, referenceFrames);
  }

  // Calculate depth (range of motion)
  const depth = calculateDepth(angles, referenceFrames);

  // Extract visibility confidence (0-1)
  const visibilityScore = visibility || 0.5;

  // Check against thresholds
  const passesMinForm = formScore >= thresholds.minFormScore;
  const passesMinDepth = depth >= thresholds.minDepth;
  const passesVisibility = visibilityScore >= thresholds.visibilityThreshold;
  const passesPoseMatch = formScore >= thresholds.poseMatchThreshold;

  let isValid = passesMinForm && passesMinDepth && passesVisibility && passesPoseMatch;
  let reason = null;

  if (!passesVisibility) {
    reason = `Visibility too low: ${(visibilityScore * 100).toFixed(0)}%`;
  } else if (!passesPoseMatch) {
    reason = `Form doesn't match reference: ${(formScore * 100).toFixed(0)}%`;
  } else if (!passesMinForm) {
    reason = `Form quality insufficient: ${(formScore * 100).toFixed(0)}%`;
  } else if (!passesMinDepth) {
    reason = `Insufficient depth: ${(depth * 100).toFixed(0)}%`;
  }

  return {
    formScore: Math.min(formScore, 1),  // Normalize to 0-1
    depth: Math.min(depth, 1),
    visibility: visibilityScore,
    isValid,
    reason,
  };
}

/**
 * Score live form against master reference frames
 * Returns score 0-1 (normalized from 0-100)
 */
function scoreLiveFormAgainstReference(exerciseName, repData, masterReference) {
  try {
    if (!repData.frames || repData.frames.length === 0) {
      return 0;
    }

    // Average score across all frames in the rep
    let totalScore = 0;
    let frameCount = 0;

    for (const liveFrame of repData.frames) {
      // Find closest reference frame by time
      const timeSeconds = liveFrame.t || 0;
      const referenceFrame = exerciseReferences.getReferenceFrameAtTime(
        exerciseName,
        timeSeconds
      );

      if (referenceFrame) {
        const score = exerciseReferences.scoreFormAccuracy(
          exerciseName,
          liveFrame,
          referenceFrame
        );
        totalScore += score;
        frameCount++;
      }
    }

    // Return normalized score (0-1)
    if (frameCount === 0) return 0;
    return (totalScore / frameCount) / 100; // Normalize from 0-100 to 0-1
  } catch (error) {
    console.error('[PoseValidator] Error scoring against reference:', error.message);
    return 0;
  }
}

/**
 * Calculate form score (0-1) by comparing user pose to reference frames
 * Uses angle and distance matching against the reference motion library
 */
function calculateFormScore(userAngles, userDistances, referenceFrames) {
  if (!userAngles || !referenceFrames || referenceFrames.length === 0) {
    return 0;
  }

  // Find best matching frame in reference set
  let bestMatch = 0;
  let highestScore = 0;

  for (let i = 0; i < referenceFrames.length; i++) {
    const refFrame = referenceFrames[i];
    const score = compareFrames(userAngles, userDistances, refFrame);

    if (score > highestScore) {
      highestScore = score;
      bestMatch = i;
    }
  }

  // Form score is how closely we match the best frame
  // Normalized to 0-1 range
  return Math.min(highestScore / 100, 1);
}

/**
 * Compare user pose to a single reference frame
 * Returns similarity score (0-100)
 */
function compareFrames(userAngles, userDistances, refFrame) {
  if (!refFrame.aQ && !refFrame.dQ) {
    return 50; // Default if no reference data
  }

  let totalDifference = 0;
  let comparisonCount = 0;

  // Compare angles
  if (Array.isArray(userAngles) && Array.isArray(refFrame.aQ)) {
    for (let i = 0; i < Math.min(userAngles.length, refFrame.aQ.length); i++) {
      if (userAngles[i] !== null && userAngles[i] !== undefined && refFrame.aQ[i] !== null) {
        const diff = Math.abs(userAngles[i] - refFrame.aQ[i]);
        totalDifference += diff;
        comparisonCount++;
      }
    }
  }

  // Compare distances
  if (Array.isArray(userDistances) && Array.isArray(refFrame.dQ)) {
    for (let i = 0; i < Math.min(userDistances.length, refFrame.dQ.length); i++) {
      if (userDistances[i] !== null && userDistances[i] !== undefined && refFrame.dQ[i] !== null) {
        const diff = Math.abs(userDistances[i] - refFrame.dQ[i]);
        totalDifference += diff / 10; // Scale down distance differences
        comparisonCount++;
      }
    }
  }

  if (comparisonCount === 0) {
    return 50; // No comparable data
  }

  // Convert difference to similarity score
  const avgDifference = totalDifference / comparisonCount;
  const similarityScore = Math.max(0, 100 - avgDifference);

  return similarityScore;
}

/**
 * Calculate depth (range of motion) from angle data
 * Compares min/max values in user's rep to reference range
 */
function calculateDepth(userAngles, referenceFrames) {
  if (!Array.isArray(userAngles) || userAngles.length === 0) {
    return 0;
  }

  // Filter out nulls to get actual angle values
  const validAngles = userAngles.filter(a => a !== null && a !== undefined);
  if (validAngles.length === 0) {
    return 0;
  }

  // Calculate user's range of motion
  const userMin = Math.min(...validAngles);
  const userMax = Math.max(...validAngles);
  const userRange = userMax - userMin;

  // Calculate reference range from all frames
  let refMin = Infinity;
  let refMax = -Infinity;

  for (const frame of referenceFrames) {
    if (Array.isArray(frame.aQ)) {
      for (const angle of frame.aQ) {
        if (angle !== null && angle !== undefined) {
          refMin = Math.min(refMin, angle);
          refMax = Math.max(refMax, angle);
        }
      }
    }
  }

  if (refMin === Infinity || refMax === -Infinity) {
    return 0.5; // Default if no reference data
  }

  const refRange = refMax - refMin;
  if (refRange === 0) {
    return 0.5;
  }

  // Depth is ratio of user's range to reference range (0-1)
  const depthRatio = userRange / refRange;
  return Math.min(depthRatio, 1); // Cap at 1.0
}

/**
 * Batch validate multiple reps
 * Returns array of validation results
 */
function validateMultipleReps(repDataArray, exerciseName) {
  if (!Array.isArray(repDataArray)) {
    return [];
  }

  return repDataArray.map(rep => validateRepForm(rep, exerciseName));
}

/**
 * Get form feedback (human-readable explanation)
 */
function getFormFeedback(validationResult, exerciseName) {
  const { isValid, formScore, depth, visibility, reason } = validationResult;

  if (isValid) {
    if (formScore > 0.95) {
      return 'Excellent form!';
    } else if (formScore > 0.85) {
      return 'Great form!';
    } else if (formScore > 0.75) {
      return 'Good form';
    } else {
      return 'Form acceptable';
    }
  }

  return reason || 'Invalid rep';
}

module.exports = {
  validateRepForm,
  validateMultipleReps,
  calculateFormScore,
  calculateDepth,
  compareFrames,
  getFormFeedback,
};
