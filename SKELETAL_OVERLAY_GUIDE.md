# Skeletal Form Overlay System

## Overview

Real-time skeletal visualization showing **correct form (green)** vs **live form (red/yellow)** with instant feedback and corrections.

```
Reference Frame          Live Pose          Difference Highlighted
(Green Skeleton)         (Red/Yellow)       (Arrows & Red Circles)
     ↓                        ↓                      ↓
     [Correct Form]    +  [Your Form]    →  [Corrections Needed]
```

---

## Components

### 1. **SkeletalVisualizer.js** (`live-server/public/skeletal-visualizer.js`)

Canvas-based skeleton renderer with comparison algorithms.

**Key Methods:**
- `drawSkeleton(keypoints, color, lineWidth, pointRadius, confidence)` - Render skeleton
- `drawComparison(liveKeypoints, referenceKeypoints, formScore)` - Side-by-side view
- `drawOverlay(liveKeypoints, referenceKeypoints, formScore)` - Overlaid view
- `highlightDifferences(liveKeypoints, referenceKeypoints, threshold)` - Show errors
- `drawFormScoreBar(score)` - Visual progress indicator

### 2. **Form Overlay Demo** (`live-server/public/form-overlay-demo.html`)

Interactive demo page showing the visualizer in action.

**Access:** `http://localhost:8080/form-overlay-demo.html`

---

## Integration in Game Client

### Basic Setup

```html
<!-- Include visualizer -->
<script src="/skeletal-visualizer.js"></script>

<!-- Create canvas -->
<canvas id="formCanvas" width="640" height="480"></canvas>

<script>
  // Initialize
  const visualizer = new SkeletalVisualizer('formCanvas');

  // On each pose frame from ML Kit:
  function processPoseFrame(liveKeypoints) {
    // Get reference skeleton
    const referenceKeypoints = getReferenceKeypoints();
    
    // Get form score from server
    const formScore = await scoreForm(liveKeypoints);
    
    // Render overlay
    visualizer.drawOverlay(liveKeypoints, referenceKeypoints, formScore);
  }
</script>
```

---

## View Modes

### Mode 1: Overlay View (Recommended for Live Play)

```javascript
visualizer.drawOverlay(liveKeypoints, referenceKeypoints, formScore);
```

**What it shows:**
- Reference skeleton (green, semi-transparent) behind
- Live skeleton (color-coded) in front
- Red circles on joints that are wrong
- Arrows pointing to corrections
- Form score bar + feedback text

**Best for:** Real-time gameplay, immediate feedback

### Mode 2: Side-by-Side Comparison (For Analysis)

```javascript
visualizer.drawComparison(liveKeypoints, referenceKeypoints, formScore);
```

**What it shows:**
- Left side: Reference (green)
- Right side: Live form (red/yellow/green)
- Full labels
- Form score

**Best for:** Training mode, form analysis, tutorials

---

## Form Score Interpretation

| Score | Color | Status | Action |
|-------|-------|--------|--------|
| 90-100 | 🟢 Green | Perfect | Rep counts, max points |
| 70-89 | 🟡 Yellow | Good | Minor adjustments needed |
| 50-69 | 🟠 Orange | Fair | Significant form errors |
| 0-49 | 🔴 Red | Poor | Rep rejected, try again |

### Calculation

Server sends form score (0-100):
```javascript
{
  "formScore": 85,
  "exercise": "pushups",
  "timestamp": Date.now()
}
```

---

## Real-Time Data Flow

```
ML Kit Pose Detector
  ↓
Captures 17 keypoints + confidence
  ↓
Format: [
  { x, y, name: "shoulder" },
  { x, y, name: "elbow" },
  ...
]
  ↓
SkeletalVisualizer.drawOverlay()
  ↓
Compare against reference frames
  ↓
Highlight differences
  ↓
Display form score
  ↓
User adjusts form
  ↓
Repeat
```

---

## Keypoint Structure

```javascript
keypoint = {
  x: number,           // X pixel position on canvas
  y: number,           // Y pixel position on canvas
  name: string,        // Joint name
  confidence: number   // 0-1 detection confidence (optional)
}
```

**Valid Joint Names:**
```
nose, leftEye, rightEye, leftEar, rightEar,
leftShoulder, rightShoulder, leftElbow, rightElbow,
leftWrist, rightWrist, leftHip, rightHip,
leftKnee, rightKnee, leftAnkle, rightAnkle
```

---

## Client-Side Implementation Example

### Full Game Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Live Exercise Game</title>
  <style>
    #gameContainer {
      position: relative;
      width: 640px;
      height: 480px;
      background: black;
    }
    #gameCanvas { position: absolute; top: 0; left: 0; }
    #formCanvas { position: absolute; top: 0; left: 0; }
  </style>
</head>
<body>
  <div id="gameContainer">
    <canvas id="gameCanvas" width="640" height="480"></canvas>
    <canvas id="formCanvas" width="640" height="480"></canvas>
  </div>

  <script src="skeletal-visualizer.js"></script>
  <script src="ml-kit-pose.js"></script>
  <script>
    const visualizer = new SkeletalVisualizer('formCanvas');
    const poseDetector = new MLKitPoseDetector();
    
    let referenceFrames = [];
    
    // Load reference frames
    async function loadReference(exerciseName) {
      const response = await fetch(`/exercises/${exerciseName}/frames`);
      const data = await response.json();
      referenceFrames = data.frames;
      console.log(`Loaded ${referenceFrames.length} reference frames for ${exerciseName}`);
    }
    
    // Process video frames
    async function processFrame(videoElement) {
      const poses = await poseDetector.estimatePoses(videoElement);
      
      if (poses.length === 0) return; // No pose detected
      
      const pose = poses[0];
      const keypoints = pose.keypoints.map(kp => ({
        x: kp.x,
        y: kp.y,
        name: getKeypointName(kp.index),
        confidence: kp.score
      }));
      
      // Get score from server
      const scoreResponse = await fetch('/exercises/pushups/score-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liveFrame: {
            t: Date.now() / 1000,
            aQ: extractAngles(keypoints),
            dQ: extractDistances(keypoints),
            visQ: calculateVisibility(keypoints)
          },
          referenceTimeSeconds: 0.5
        })
      });
      
      const { formScore } = await scoreResponse.json();
      
      // Get reference
      const time = (Date.now() / 100) % referenceFrames.length;
      const referenceFrame = referenceFrames[Math.floor(time)];
      const referenceKeypoints = frameToKeypoints(referenceFrame);
      
      // Render
      visualizer.drawOverlay(keypoints, referenceKeypoints, formScore);
      
      requestAnimationFrame(() => processFrame(videoElement));
    }
    
    // Start
    await loadReference('pushups');
    processFrame(document.getElementById('video'));
  </script>
</body>
</html>
```

---

## Customization

### Change Skeleton Connections

```javascript
// In SkeletalVisualizer constructor:
this.skeleton = [
  [15, 13], [13, 11],  // Left arm
  [16, 14], [14, 12],  // Right arm
  // ... add or remove connections
];
```

### Change Colors

```javascript
// Green reference
visualizer.drawSkeleton(refKeypoints, '#00FF00');

// Red live
visualizer.drawSkeleton(liveKeypoints, '#FF0000');

// Yellow for mid-range
visualizer.drawSkeleton(liveKeypoints, '#FFFF00');
```

### Adjust Difference Threshold

```javascript
// Highlight joints off by more than 50 pixels
visualizer.highlightDifferences(liveKeypoints, referenceKeypoints, 50);
```

### Change Point Size

```javascript
// Larger points for visibility
visualizer.drawSkeleton(keypoints, '#00FF00', 4, 12, 1.0);
// Parameters: keypoints, color, lineWidth, pointRadius, confidence
```

---

## Performance Optimization

### For Mobile/Termux

1. **Reduce rendering frequency**
   ```javascript
   let lastRender = 0;
   const RENDER_INTERVAL = 33; // ~30 FPS
   
   if (Date.now() - lastRender > RENDER_INTERVAL) {
     visualizer.drawOverlay(...);
     lastRender = Date.now();
   }
   ```

2. **Simplify skeleton**
   ```javascript
   // Render only key joints
   const keyJoints = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
   visualizer.drawSkeleton(keyJoints, color);
   ```

3. **Lower canvas resolution**
   ```javascript
   visualizer.width = 480;
   visualizer.height = 380;
   ```

---

## Testing

### 1. View Demo Page

```bash
# Start Live Server
npm start

# Open browser
http://localhost:8080/form-overlay-demo.html
```

### 2. Interactive Testing

- Drag **Accuracy slider** to simulate different form scores
- Click **View Mode buttons** to switch between overlay/comparison
- Click **Start Animation** to see auto-oscillating score

### 3. Real Pose Testing (When Integrated)

```javascript
// Test by sending mock keypoints
const mockKeypoints = [
  { x: 100, y: 200, name: 'shoulder' },
  { x: 150, y: 250, name: 'elbow' },
  // ... all 17 keypoints
];

visualizer.drawOverlay(mockKeypoints, referenceKeypoints, 85);
```

---

## API Reference

### Methods

| Method | Params | Returns | Purpose |
|--------|--------|---------|---------|
| `drawSkeleton()` | keypoints, color, lineWidth, pointRadius, confidence | void | Render single skeleton |
| `drawComparison()` | liveKeypoints, referenceKeypoints, formScore | void | Side-by-side view |
| `drawOverlay()` | liveKeypoints, referenceKeypoints, formScore | void | Overlaid comparison |
| `highlightDifferences()` | liveKeypoints, referenceKeypoints, threshold | void | Show error joints |
| `drawFormScoreBar()` | score | void | Progress bar |
| `clear()` | - | void | Blank canvas |
| `resize()` | - | void | Adapt to container |

### Properties

| Property | Type | Purpose |
|----------|------|---------|
| `canvas` | HTMLCanvasElement | Reference to canvas |
| `ctx` | CanvasRenderingContext2D | Drawing context |
| `keypoints` | string[] | List of joint names |
| `skeleton` | number[][] | Connection pairs |

---

## Troubleshooting

### Canvas Not Rendering

```javascript
// Ensure canvas exists
const canvas = document.getElementById('formCanvas');
if (!canvas) console.error('Canvas not found!');

// Check context
const ctx = canvas.getContext('2d');
if (!ctx) console.error('Could not get 2D context!');

// Verify size
console.log(`Canvas: ${canvas.width}x${canvas.height}`);
```

### Keypoints Off-Screen

```javascript
// Keypoints might be outside canvas bounds
// Add bounds checking:
if (kp.x < 0 || kp.x > canvas.width) {
  console.warn('Keypoint out of bounds:', kp);
}
```

### Performance Issues

```javascript
// Reduce skeleton complexity
visualizer.skeleton = [[5,7], [7,9], [6,8], [8,10]]; // Arms only

// Use lower FPS
const FPS = 15;
setInterval(() => draw(), 1000 / FPS);
```

---

## Summary

✅ **Real-time form validation** with visual feedback
✅ **Instant corrections** via highlighted differences
✅ **Side-by-side comparison** for analysis
✅ **Mobile-optimized** canvas rendering
✅ **Color-coded scores** (green/yellow/red)
✅ **Anti-cheat** by comparing to master references

**Ready to integrate!** Users will see exactly how their form compares to perfect execution. 🎯
