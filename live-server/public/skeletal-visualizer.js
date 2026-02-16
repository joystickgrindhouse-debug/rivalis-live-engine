/**
 * Skeletal Visualization & Form Comparison
 * Renders pose keypoints and skeleton on canvas
 * Shows correct form (reference) vs live form with difference highlighting
 */

class SkeletalVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`Canvas ${canvasId} not found`);
    
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    
    // Pose keypoints (ML Kit pose detector output)
    this.keypoints = [
      'nose', 'leftEye', 'rightEye', 'leftEar', 'rightEar',
      'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow',
      'leftWrist', 'rightWrist', 'leftHip', 'rightHip',
      'leftKnee', 'rightKnee', 'leftAnkle', 'rightAnkle'
    ];
    
    // Skeleton connections (which keypoints connect)
    this.skeleton = [
      [15, 13], [13, 11], [16, 14], [14, 12], [11, 12],
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
      [1, 2], [0, 1], [0, 2], [1, 3], [2, 4],
      [3, 5], [4, 6], [11, 5], [12, 6]
    ];
    
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  /**
   * Convert angle/distance data from reference frame to keypoint positions
   * Used for rendering reference skeleton
   */
  convertReferenceFrameToKeypoints(referenceFrame, eachExercise) {
    // This is a simplified conversion
    // In production, you'd have a full frame->keypoints mapping per exercise
    // For now, we'll just return placeholder positions
    
    const keypoints = [];
    const baseX = this.width / 2;
    const baseY = this.height / 2;
    
    // Create skeleton based on reference frame data
    // This would be customized per exercise
    // For demo, create a centered figure
    
    return {
      keypoints: this.generateDefaultKeypoints(baseX, baseY),
      confidence: referenceFrame.visQ / 100
    };
  }

  /**
   * Generate default skeleton at a position (for visualization)
   */
  generateDefaultKeypoints(centerX, centerY) {
    const scale = 80;
    return [
      { x: centerX, y: centerY - scale * 1.2, name: 'nose' },          // 0
      { x: centerX - scale * 0.2, y: centerY - scale * 1.0, name: 'leftEye' },    // 1
      { x: centerX + scale * 0.2, y: centerY - scale * 1.0, name: 'rightEye' },   // 2
      { x: centerX - scale * 0.4, y: centerY - scale * 0.9, name: 'leftEar' },    // 3
      { x: centerX + scale * 0.4, y: centerY - scale * 0.9, name: 'rightEar' },   // 4
      { x: centerX - scale * 0.8, y: centerY - scale * 0.2, name: 'leftShoulder' },  // 5
      { x: centerX + scale * 0.8, y: centerY - scale * 0.2, name: 'rightShoulder' }, // 6
      { x: centerX - scale * 1.2, y: centerY + scale * 0.1, name: 'leftElbow' },     // 7
      { x: centerX + scale * 1.2, y: centerY + scale * 0.1, name: 'rightElbow' },    // 8
      { x: centerX - scale * 1.5, y: centerY + scale * 0.3, name: 'leftWrist' },     // 9
      { x: centerX + scale * 1.5, y: centerY + scale * 0.3, name: 'rightWrist' },    // 10
      { x: centerX - scale * 0.5, y: centerY + scale * 0.8, name: 'leftHip' },       // 11
      { x: centerX + scale * 0.5, y: centerY + scale * 0.8, name: 'rightHip' },      // 12
      { x: centerX - scale * 0.5, y: centerY + scale * 1.5, name: 'leftKnee' },      // 13
      { x: centerX + scale * 0.5, y: centerY + scale * 1.5, name: 'rightKnee' },     // 14
      { x: centerX - scale * 0.5, y: centerY + scale * 2.2, name: 'leftAnkle' },     // 15
      { x: centerX + scale * 0.5, y: centerY + scale * 2.2, name: 'rightAnkle' }     // 16
    ];
  }

  /**
   * Draw skeleton on canvas
   */
  drawSkeleton(keypoints, color = '#00FF00', lineWidth = 2, pointRadius = 4, confidence = 1) {
    if (!keypoints || keypoints.length === 0) return;

    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = Math.max(0.5, confidence);

    // Draw connections (lines)
    for (const [start, end] of this.skeleton) {
      if (keypoints[start] && keypoints[end]) {
        const p1 = keypoints[start];
        const p2 = keypoints[end];
        
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }

    // Draw keypoints (circles)
    for (const kp of keypoints) {
      if (kp && kp.x && kp.y) {
        this.ctx.beginPath();
        this.ctx.arc(kp.x, kp.y, pointRadius, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw comparison view: reference (green) vs live (red)
   */
  drawComparison(liveKeypoints, referenceKeypoints, formScore = 0) {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw reference skeleton (left side - green)
    const refLeft = referenceKeypoints.map(kp => ({
      ...kp,
      x: kp.x ? kp.x * 0.45 : 0,
      y: kp.y || 100
    }));

    // Draw live skeleton (right side - red/yellow based on accuracy)
    const liveScale = this.getColorForScore(formScore);
    const liveRight = liveKeypoints.map(kp => ({
      ...kp,
      x: kp.x ? this.width * 0.5 + kp.x * 0.45 : this.width * 0.5,
      y: kp.y || 100
    }));

    // Draw reference (green)
    this.drawSkeleton(refLeft, '#00FF00', 3, 5, 0.8);
    
    // Draw live (color based on accuracy)
    const liveColor = formScore > 80 ? '#00FF00' : (formScore > 60 ? '#FFFF00' : '#FF0000');
    this.drawSkeleton(liveRight, liveColor, 3, 5, 1.0);

    // Add labels
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('CORRECT FORM (Reference)', 50, 30);
    this.ctx.fillText(`YOUR FORM (Score: ${formScore}%)`, this.width * 0.5 + 30, 30);

    // Draw form score bar
    this.drawFormScoreBar(formScore);
  }

  /**
   * Draw an overlay view with difference highlighting
   */
  drawOverlay(liveKeypoints, referenceKeypoints, formScore = 0) {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Center both skeletons
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Draw reference skeleton (semi-transparent green)
    const refCentered = referenceKeypoints.map(kp => ({
      ...kp,
      x: centerX + (kp.x - centerX) * 0.9,
      y: centerY + (kp.y - centerY) * 0.9
    }));
    this.drawSkeleton(refCentered, '#00FF00', 4, 6, 0.4);

    // Draw live skeleton (colored red to green based on accuracy)
    const liveColor = formScore > 80 ? '#00FF00' : (formScore > 60 ? '#FFFF00' : '#FF0000');
    this.drawSkeleton(liveKeypoints, liveColor, 4, 8, 1.0);

    // Highlight differences
    this.highlightDifferences(liveKeypoints, referenceKeypoints);

    // Draw score and instructions
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(`Form Score: ${formScore}%`, 30, 50);
    
    this.ctx.font = '14px Arial';
    if (formScore > 80) {
      this.ctx.fillStyle = '#00FF00';
      this.ctx.fillText('✓ Excellent form!', 30, 80);
    } else if (formScore > 60) {
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.fillText('! Good form, slight adjustments', 30, 80);
    } else {
      this.ctx.fillStyle = '#FF0000';
      this.ctx.fillText('✗ Correct your form', 30, 80);
    }
  }

  /**
   * Highlight joints that are out of alignment
   */
  highlightDifferences(liveKeypoints, referenceKeypoints, threshold = 30) {
    if (!liveKeypoints || !referenceKeypoints) return;

    this.ctx.save();
    this.ctx.strokeStyle = '#FF3333';
    this.ctx.lineWidth = 3;
    this.ctx.fillStyle = 'rgba(255, 50, 50, 0.3)';

    for (let i = 0; i < Math.min(liveKeypoints.length, referenceKeypoints.length); i++) {
      const live = liveKeypoints[i];
      const ref = referenceKeypoints[i];

      if (!live || !ref) continue;

      const dx = (live.x || 0) - (ref.x || 0);
      const dy = (live.y || 0) - (ref.y || 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If keypoint is off by more than threshold, highlight it
      if (distance > threshold) {
        this.ctx.beginPath();
        this.ctx.arc(live.x, live.y, 15, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();

        // Draw arrow pointing to correct position
        this.drawArrow(live.x, live.y, ref.x, ref.y);
      }
    }

    this.ctx.restore();
  }

  /**
   * Draw arrow from current joint to correct position
   */
  drawArrow(fromX, fromY, toX, toY, headlen = 15) {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.ctx.strokeStyle = '#FF6666';
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // Arrow head
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    this.ctx.stroke();
  }

  /**
   * Draw form score progress bar
   */
  drawFormScoreBar(score) {
    const barWidth = 200;
    const barHeight = 30;
    const x = this.width - barWidth - 20;
    const y = this.height - barHeight - 20;

    // Background
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(x, y, barWidth, barHeight);

    // Bar color based on score
    const color = score > 80 ? '#00FF00' : (score > 60 ? '#FFFF00' : '#FF0000');
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, (barWidth * score) / 100, barHeight);

    // Border
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    // Text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${score}%`, x + barWidth / 2, y + barHeight / 2 + 5);
  }

  /**
   * Get color based on form score
   */
  getColorForScore(score) {
    if (score > 80) return '#00FF00'; // Green
    if (score > 60) return '#FFFF00'; // Yellow
    return '#FF0000'; // Red
  }

  /**
   * Clear canvas
   */
  clear() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Resize canvas to fit container
   */
  resize() {
    this.width = this.canvas.offsetWidth;
    this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SkeletalVisualizer;
}
