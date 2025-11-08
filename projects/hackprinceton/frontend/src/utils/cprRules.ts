/**
 * CPR Detection Rules - Research-Based
 * Based on AHA guidelines and CPR best practices
 */

export enum FeedbackPriority {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface CPRFeedback {
  message: string;
  priority: FeedbackPriority;
  color: 'green' | 'orange' | 'red';
}

/**
 * Compression Rate Rules
 * Target: 100-120 BPM (AHA guidelines)
 */
export const CompressionRateRules = {
  TARGET_RATE_MIN: 100,
  TARGET_RATE_MAX: 120,
  CRITICAL_SLOW: 80,
  CRITICAL_FAST: 140,
  MIN_COMPRESSIONS_FOR_RATE: 5,
  DEBOUNCE_TIME_MS: 300,
  RATE_WINDOW_SIZE: 8,

  getRateFeedback(currentBPM: number, compressionCount: number): CPRFeedback {
    if (compressionCount < this.MIN_COMPRESSIONS_FOR_RATE) {
      return {
        message: 'Continue compressions',
        priority: FeedbackPriority.NONE,
        color: 'green',
      };
    }

    if (currentBPM === 0) {
      return {
        message: 'No compressions detected - start compressions',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    if (currentBPM < this.CRITICAL_SLOW) {
      return {
        message: 'Much too slow! Speed up immediately',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    if (currentBPM >= this.CRITICAL_SLOW && currentBPM < this.TARGET_RATE_MIN) {
      return {
        message: 'Too slow - increase pace to 100-120 BPM',
        priority: FeedbackPriority.HIGH,
        color: 'orange',
      };
    }

    if (currentBPM >= this.TARGET_RATE_MIN && currentBPM <= this.TARGET_RATE_MAX) {
      return {
        message: 'Good rhythm - maintain pace',
        priority: FeedbackPriority.LOW,
        color: 'green',
      };
    }

    if (currentBPM > this.TARGET_RATE_MAX && currentBPM <= this.CRITICAL_FAST) {
      return {
        message: 'Too fast - slow down to 100-120 BPM',
        priority: FeedbackPriority.HIGH,
        color: 'orange',
      };
    }

    return {
      message: 'Way too fast! Reduce speed immediately',
      priority: FeedbackPriority.CRITICAL,
      color: 'red',
    };
  },
};

/**
 * Compression Depth Rules
 * Target: 50-60mm (2-2.4 inches) for adults
 */
export const CompressionDepthRules = {
  MIN_DEPTH_MM: 50,
  MAX_DEPTH_MM: 60,
  DANGEROUS_SHALLOW_MM: 38,
  DANGEROUS_DEEP_MM: 70,
  MIN_MOVEMENT_TO_COUNT_MM: 20,
  DEPTH_CONSISTENCY_WINDOW: 5,

  getDepthFeedback(
    depthMM: number,
    averageDepthLast5: number,
    shoulderWidthMM: number
  ): CPRFeedback {
    // Adjust min depth based on body size (rough estimate from shoulder width)
    const adjustedMinDepth = this.MIN_DEPTH_MM * (shoulderWidthMM / 400);

    if (depthMM < this.MIN_MOVEMENT_TO_COUNT_MM) {
      return {
        message: 'No compression detected - push harder',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    if (depthMM < this.DANGEROUS_SHALLOW_MM) {
      return {
        message: 'Much too shallow! Push at least 2 inches (50mm)',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    if (depthMM < adjustedMinDepth) {
      return {
        message: 'Push harder - need at least 2 inches depth',
        priority: FeedbackPriority.HIGH,
        color: 'orange',
      };
    }

    if (depthMM > this.DANGEROUS_DEEP_MM) {
      return {
        message: 'Too deep! Reduce pressure to avoid injury',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    if (depthMM > this.MAX_DEPTH_MM) {
      return {
        message: 'Slightly too deep - ease up a bit',
        priority: FeedbackPriority.MEDIUM,
        color: 'orange',
      };
    }

    if (Math.abs(depthMM - averageDepthLast5) > 15 && averageDepthLast5 > 0) {
      return {
        message: 'Keep compressions consistent depth',
        priority: FeedbackPriority.MEDIUM,
        color: 'orange',
      };
    }

    return {
      message: 'Good compression depth',
      priority: FeedbackPriority.LOW,
      color: 'green',
    };
  },
};

/**
 * Hand Placement Rules
 * Target: Center of chest, between nipples
 */
export const HandPlacementRules = {
  CHEST_CENTER_TOLERANCE_RATIO: 0.15, // 15% of shoulder width
  NIPPLE_LINE_OFFSET_RATIO: 0.2, // 20% below shoulders
  HAND_SEPARATION_MAX_RATIO: 0.1, // 10% of shoulder width
  MIN_HAND_CONFIDENCE: 0.5,
  PLACEMENT_STABLE_FRAMES: 10,

  getPlacementFeedback(
    leftWrist: { x: number; y: number },
    rightWrist: { x: number; y: number },
    leftShoulder: { x: number; y: number },
    rightShoulder: { x: number; y: number }
  ): CPRFeedback {
    const chestCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    const chestCenterY = leftShoulder.y + shoulderWidth * this.NIPPLE_LINE_OFFSET_RATIO;
    const handsCenterX = (leftWrist.x + rightWrist.x) / 2;
    const handsCenterY = (leftWrist.y + rightWrist.y) / 2;

    const offsetX = Math.abs(handsCenterX - chestCenterX);
    const offsetY = handsCenterY - chestCenterY;
    const handSeparation = Math.abs(leftWrist.x - rightWrist.x);

    const toleranceX = shoulderWidth * this.CHEST_CENTER_TOLERANCE_RATIO;
    const toleranceY = shoulderWidth * 0.3;
    const maxSeparation = shoulderWidth * this.HAND_SEPARATION_MAX_RATIO;

    // Check horizontal placement
    if (offsetX > toleranceX * 2) {
      return {
        message: 'Hands way off center - move to middle of chest',
        priority: FeedbackPriority.CRITICAL,
        color: 'red',
      };
    }

    // Check vertical placement
    if (offsetY < -toleranceY) {
      return {
        message: 'Hands too high - move down to center of chest',
        priority: FeedbackPriority.HIGH,
        color: 'orange',
      };
    }

    if (offsetY > toleranceY * 2) {
      return {
        message: 'Hands too low - move up between nipples',
        priority: FeedbackPriority.HIGH,
        color: 'orange',
      };
    }

    // Check hand separation
    if (handSeparation > maxSeparation) {
      return {
        message: 'Keep hands together, one on top of other',
        priority: FeedbackPriority.MEDIUM,
        color: 'orange',
      };
    }

    if (offsetX > toleranceX) {
      return {
        message: 'Center hands on breastbone',
        priority: FeedbackPriority.MEDIUM,
        color: 'orange',
      };
    }

    return {
      message: 'Good hand position',
      priority: FeedbackPriority.LOW,
      color: 'green',
    };
  },
};

/**
 * Combine all feedback into overall status
 */
export function getOverallFeedback(
  rateFeedback: CPRFeedback,
  depthFeedback: CPRFeedback,
  placementFeedback: CPRFeedback
): { message: string; color: 'green' | 'orange' | 'red' } {
  const priorities = [
    rateFeedback.priority,
    depthFeedback.priority,
    placementFeedback.priority,
  ];

  const maxPriority = Math.max(...priorities);

  // Collect all non-low priority messages
  const messages: string[] = [];
  if (rateFeedback.priority >= FeedbackPriority.MEDIUM) {
    messages.push(rateFeedback.message);
  }
  if (depthFeedback.priority >= FeedbackPriority.MEDIUM) {
    messages.push(depthFeedback.message);
  }
  if (placementFeedback.priority >= FeedbackPriority.MEDIUM) {
    messages.push(placementFeedback.message);
  }

  let color: 'green' | 'orange' | 'red' = 'green';
  if (maxPriority >= FeedbackPriority.CRITICAL) {
    color = 'red';
  } else if (maxPriority >= FeedbackPriority.HIGH) {
    color = 'orange';
  } else if (maxPriority >= FeedbackPriority.MEDIUM) {
    color = 'orange';
  }

  // If all good, show positive message
  if (maxPriority <= FeedbackPriority.LOW) {
    return {
      message: 'Excellent CPR technique! Keep it up!',
      color: 'green',
    };
  }

  return {
    message: messages.join(' • ') || 'Continue compressions',
    color,
  };
}

