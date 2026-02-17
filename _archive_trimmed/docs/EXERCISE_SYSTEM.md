# Exercise & Pose Validation System

## Overview

The Rivalis Live system now includes a comprehensive exercise validation system that validates reps against reference motion capture data. Each of the 16 exercises has:

- **Reference motion frames** (0.1 second resolution)
- **Exercise-specific thresholds** (form quality, depth, timing)
- **Biomechanical validation** (angle/distance comparison)
- **Anti-cheat pattern detection** (exercise-aware cheating indicators)

## 16 Supported Exercises

```
1. Pushups              9. Leg Raises
2. Squats              10. Glute Bridges
3. Burpees             11. Russian Twists
4. Lunges              12. Pike Pushups
5. Mountain Climbers   13. Plank Updowns
6. Jumping Jacks       14. Shoulder Taps
7. Plank               15. High Knees
8. Crunches            16. Calf Raises
```

## Architecture

### 1. Exercise Registry System

**File:** `config/exercises.js`

Loads and caches all 16 exercise JSON files with metadata:

```javascript
// Get exercise thresholds
const thresholds = exercisesConfig.getThresholds('pushups');
// Returns: {
//   minFormScore: 0.65,        // minimum form quality
//   minDepth: 0.6,             // minimum depth of motion
//   maxRepTimeMs: 3500,        // max milliseconds per rep
//   minRepTimeMs: 800,         // min milliseconds per rep
//   visibilityThreshold: 0.7,  // pose visibility confidence
//   poseMatchThreshold: 0.80   // must match reference by 80%
// }

// Get all exercises
const exercises = exercisesConfig.getAllExercises();

// Validate exercise name
if (exercisesConfig.isValidExercise('squats')) { ... }

// Get reference frames for pose comparison
const frames = exercisesConfig.getExerciseFrames('squats');
```

### 2. Pose Validation Engine

**File:** `game/poseValidator.js`

Compares user pose data against exercise reference frames:

```javascript
const validation = poseValidator.validateRepForm(repData, 'pushups');
// Returns: {
//   formScore: 0.82,        // 0-1, how well matches reference
//   depth: 0.75,            // 0-1, range of motion
//   visibility: 0.88,       // 0-1, pose confidence
//   isValid: true,          // passes all thresholds
//   reason: null
// }
```

**Form Score Calculation:**
- Compares user angles/distances to reference frames in database
- Finds best matching frame for current user pose
- Returns similarity percentage (0-100) normalized to 0-1

**Depth Score Calculation:**
- Analyzes range of motion (min/max angles)
- Compares user's ROM to reference ROM
- Ratio = user_range / reference_range (capped at 1.0)

**Visibility Score:**
- Extracted from MediaPipe/pose detection confidence
- Must be ≥ threshold or rep rejected

### 3. Card Values System

**File:** `config/cardValues.js`

Defines card effects, multipliers, and deck composition:

```javascript
// Card effects with multipliers
CARD_EFFECTS = {
  DOUBLE_REPS: {
    repMultiplier: 2.0,      // reps count 2x
    duration: 1,             // effect lasts 1 turn
    targetType: 'self',
    effect: 'Your reps count for 2x value',
  },
  FREEZE_OPPONENT: {
    repMultiplier: 0,        // opponent gets 0 reps
    targetType: 'opponent',
    effect: 'Opponent turn skipped'
  },
  // ... 3 more card types
};

// 50-card deck composition with rarity
DECK_COMPOSITION = {
  DOUBLE_REPS: 10,        // 10 cards of this type
  FREEZE_OPPONENT: 10,
  STEAL_REP: 10,
  REVERSE_ORDER: 10,
  FORM_PENALTY: 10,
};

// Rarity tiers (affects points)
CARD_RARITIES = {
  COMMON: { pointMultiplier: 1.0, dropRate: 0.50 },
  UNCOMMON: { pointMultiplier: 1.2, dropRate: 0.35 },
  RARE: { pointMultiplier: 1.5, dropRate: 0.12 },
  EPIC: { pointMultiplier: 2.0, dropRate: 0.02 },
  LEGENDARY: { pointMultiplier: 3.0, dropRate: 0.01 },
};
```

### 4. Rep Engine Integration

**File:** `game/repEngine.js`

Updated to process reps with pose validation and card multipliers:

```javascript
function processRep(rep, exerciseName, activeCards, currentTurn, playerId) {
  // Validates pose against exercise reference
  const validation = poseValidator.validateRepForm(rep, exerciseName);
  
  if (!validation.isValid) {
    return { repsAdded: 0, scoreAdded: 0, isValid: false, reason: ... };
  }

  // Calculate base score from quality
  let scoreAdded = 100;
  const qualityBonus = 1 + (formScore * 0.6) + (depthQuality * 0.4);
  scoreAdded = Math.floor(scoreAdded * qualityBonus);

  // Apply card multipliers (DOUBLE_REPS, FORM_PENALTY)
  let repsAdded = 1;
  if (isCardActive(DOUBLE_REPS)) {
    repsAdded *= 2;
    scoreAdded *= 2;
  }

  return {
    repsAdded,
    scoreAdded,
    formScore: validation.formScore,
    depth: validation.depth,
    exercise: exerciseName,
    isValid: true,
  };
}
```

### 5. Anti-Cheat System Enhancement

**File:** `game/antiCheat.js`

Updated validateRep to use exercise-specific thresholds:

```javascript
function validateRep(rep, antiCheatState, serverTime, exerciseName) {
  const exerciseThresholds = exercisesConfig.getThresholds(exerciseName);
  
  // Validate against exercise-specific thresholds
  if (repTimeMs < exerciseThresholds.minRepTimeMs ||
      repTimeMs > exerciseThresholds.maxRepTimeMs) {
    return { valid: false, reason: `Rep time outside bounds for ${exerciseName}` };
  }
  
  if (formScore < exerciseThresholds.minFormScore) {
    return { valid: false, reason: `Form below minimum for ${exerciseName}` };
  }
  
  // ... rest of validation
}
```

**Exercise-Aware Pattern Detection:**

```javascript
function detectSuspiciousPattern(currentRep, recentReps, exerciseName) {
  // Generic patterns
  if (timeSinceLastRep < minRepTime * 0.5) {
    suspicion += 1;  // Too fast for exercise
  }
  
  // Exercise-specific patterns
  if (exerciseName.includes('plank')) {
    // Planks should have consistent depth (isometric)
    if (depthVariation > 0.3) {
      suspicion += 1;  // Too much variation
    }
  }
  
  if (exerciseName.includes('jumps') || exerciseName.includes('high_knees')) {
    // Dynamic exercises should be faster
    if (timeSinceLastRep < 300) {
      suspicion += 0.5;  // Unlikely this fast
    }
  }
}
```

## Exercise-Specific Parameters

Each exercise has unique thresholds optimized for biomechanics:

### Pushups
- `minFormScore: 0.65` - Need good form on arms/chest
- `maxRepTimeMs: 3500` - Slower than fast exercises
- `poseMatchThreshold: 0.80` - 80% match to reference

### Squats
- `minDepth: 0.75` - Deep squats required
- `maxRepTimeMs: 2500` - Usually faster
- `minFormScore: 0.60` - Form less critical than depth

### Plank
- `maxRepTimeMs: 5000` - Endurance, can be longer
- `minFormScore: 0.75` - Form critical (static hold)
- `poseMatchThreshold: 0.85` - Very high precision

### Mountain Climbers
- `minRepTimeMs: 600` - Fast movement
- `maxRepTimeMs: 2000` - Can't be too slow
- `minFormScore: 0.60` - Speed OK, form secondary

### Burpees
- `maxRepTimeMs: 4000` - Complex multi-step movement
- `minFormScore: 0.70` - High skill required
- `poseMatchThreshold: 0.82` - Detailed form validation

## Data Flow Example: Rep Submission

```
1. Client submits rep:
   {
     exerciseName: "pushups",
     depth: 0.82,
     formScore: 0.75,
     repTimeMs: 2100,
     angles: [290, 280, 52, ...],    // Pose angles
     distances: [1476, null, 1274], // Pose distances
     visibility: 0.88,
     timestamp: 1708888123456
   }

2. Anti-cheat validation (antiCheat.js):
   - Check exercise-specific time bounds (800-3500ms for pushups) ✓
   - Check form threshold (≥0.65 for pushups) ✓
   - Check depth threshold (≥0.6) ✓
   - Pattern detection (no suspicion indicators) ✓
   
3. Pose validation (poseValidator.js):
   - Compare submitted angles/distances to reference frames
   - Calculate form match score (0-1)
   - Verify depth range of motion
   - Return validation result
   
4. Rep processing (repEngine.js):
   - Apply exercise-specific quality bonus
   - Calculate base reps (1 + card multipliers)
   - Calculate base score (100 * quality * card multipliers)
   - Return: repsAdded: 1.5, scoreAdded: 185 (with bonus)
   
5. Update session:
   - Add to player stats
   - Check if any cards trigger effects
   - Update leaderboard
```

## Deck Composition & Card Rarities

When a card is drawn, it includes rarity information:

```javascript
card = {
  id: "DOUBLE_REPS_UNCOMMON_5",
  type: "DOUBLE_REPS",
  name: "Double Power",
  rarity: "UNCOMMON",              // Affects points
  repMultiplier: 2.0,              // Effect strength
  effect: "Your reps count for 2x",
  points: 24,                      // 20 * 1.2 (uncommon multiplier)
  targetType: "self",
  duration: 1
}
```

**Drop Rates:**
- Common: 50% (point multiplier 1.0x)
- Uncommon: 35% (point multiplier 1.2x)
- Rare: 12% (point multiplier 1.5x)
- Epic: 2% (point multiplier 2.0x)
- Legendary: 1% (point multiplier 3.0x)

## Configuration Tuning

### Adjust Exercise Thresholds

Edit `config/exercises.js`:

```javascript
// Make pushups stricter
overrides: {
  pushups: {
    minFormScore: 0.75,        // Increased from 0.65
    poseMatchThreshold: 0.85,  // Increased from 0.80
    maxRepTimeMs: 3000,        // Decreased from 3500
  },
  ... 
}
```

### Adjust Anti-Cheat Scoring

Edit `config/limits.js`:

```javascript
SUSPICION_THRESHOLD: 5,        // Auto-kick after 5 points (adjust higher for lenient)
ROLLING_WINDOW_SIZE: 50,       // How many reps to analyze (larger = stricter)
IDENTICAL_TIMESTAMP_WINDOW_MS: 100,  // Replay detection window
```

### Adjust Card Effects

Edit `config/cardValues.js`:

```javascript
DOUBLE_REPS: {
  repMultiplier: 2.5,    // Make cards more powerful (was 2.0)
  duration: 2,           // Longer effect (was 1)
  ...
},
```

## Integration Points

### In sessionManager.js

```javascript
// Update submitRep to pass exercise name
const result = repEngine.updatePlayerStats(
  playerRepState,
  rep,
  session.currentExercise,  // Pass exercise name
  session.activeCards,
  session.currentTurn,
  playerId
);
```

### In turnManager.js

```javascript
// Pass exercise name when drawing cards
const card = deckEngine.drawCard(session.deck);
// Card now includes: type, name, rarity, points, repMultiplier, effect, etc.
```

### In anti-cheat calls

```javascript
// Pass exercise name for validation
const validation = antiCheat.validateRep(
  rep,
  player.antiCheatState,
  Date.now(),
  session.currentExercise  // Pass exercise name
);
```

## Performance Characteristics

- **Pose validation:** <50ms (angle/distance comparison)
- **Anti-cheat check:** <10ms (pattern analysis on 50-rep window)
- **Rep processing:** <5ms (card lookup, multiplier calc)
- **Total per rep:** ~65ms worst case, typically <50ms
- **Memory per exercise:** ~50KB (reference frames cached on startup)
- **Memory per player:** ~5KB (50-rep rolling window)

## Example API Response

```json
{
  "success": true,
  "rep": {
    "exercise": "pushups",
    "repsAdded": 1,
    "scoreAdded": 165,
    "formScore": 0.82,
    "depth": 0.75,
    "visibility": 0.88,
    "validationPassed": true
  },
  "playerStats": {
    "totalReps": 45,
    "sessionScore": 4285,
    "leaderboardPosition": 2
  },
  "activeCards": [
    {
      "cardId": "DOUBLE_REPS",
      "expiresAtTurn": 8,
      "effect": "Your reps count for 2x value"
    }
  ]
}
```

## Bots & Exercise-Specific Reps

Bot rep generation uses exercise-specific parameters from thresholds:

```javascript
function generateBotRep(botConfig, exerciseName) {
  const thresholds = exercisesConfig.getThresholds(exerciseName);
  
  // Generate within exercise constraints
  const baseDepth = thresholds.minDepth + 0.15;  // Just above minimum
  const repTime = thresholds.minRepTimeMs + Math.random() * 1500;
  
  // Return valid rep with realistic variation
  return {
    depth: baseDepth + (Math.random() - 0.5) * 0.15,
    formScore: baseDepth + (Math.random() - 0.5) * 0.20,
    repTimeMs: repTime,
    visibility: 0.75 + Math.random() * 0.20,
    timestamp: Date.now()
  };
}
```

## Troubleshooting

### "Form doesn't match reference"
- User form differs significantly from expected biomechanics
- Verify exercise is being performed correctly
- Check visibility score (must be ≥0.7)

### "Insufficient depth"
- User not achieving minimum range of motion
- Specific exercises (squats, leg raises) require >0.75 depth
- Monitor form to identify form breaks

### "Suspicion threshold exceeded"
- Multiple pattern indicators detected (too fast, too perfect, etc.)
- User was kicked from session
- Anti-cheat protection working as intended

### "Rep time outside bounds"
- Submission took too long/short for exercise
- Burpees: allow 4000ms (complex), pushups: 3500ms (moderate)
- High knees: require <1500ms (fast movement)

## Future Enhancements

1. **Machine learning form scoring** - Train model on reference data
2. **Real-time coaching feedback** - "Go deeper on next rep"
3. **Per-player calibration** - Adjust thresholds by fitness level
4. **Exercise variants** - Different difficulty levels (archer pushups, pistol squats)
5. **Video replay analysis** - Store/analyze suspicious submissions
