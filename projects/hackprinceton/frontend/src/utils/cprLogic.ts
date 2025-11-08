/**
 * CPR Logic Utilities
 * Calculate BPM, compression depth, and hand placement from pose keypoints
 * Updated with simplified approach based on proven Python implementation
 */

import {
  CompressionRateRules,
  CompressionDepthRules,
  HandPlacementRules,
  getOverallFeedback,
  CPRFeedback,
} from './cprRules';

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
}

export interface HandPlacementResult {
  placement: 'Good' | 'Off-center';
  offsetRatio: number;
  feedback: CPRFeedback;
}

export interface CPRMetrics {
  bpm: number;
  depthMm: number;
  placement: 'Good' | 'Off-center';
  compressionCount: number;
  rateFeedback: CPRFeedback;
  depthFeedback: CPRFeedback;
  placementFeedback: CPRFeedback;
  overallFeedback: { message: string; color: 'green' | 'orange' | 'red' };
}

/**
 * Calculate BPM using last 4 compressions (like Python implementation)
 * Uses weighted average for smoothing (70% new, 30% previous)
 */
export function calculateBPM(
  compressionTimes: number[],
  previousBPM: number = 0
): number {
  if (compressionTimes.length < 2) {
    return previousBPM; // Return previous BPM if not enough data
  }

  // Use only the last 4 compressions for more accurate BPM
  const recentTimes = compressionTimes.length >= 4 
    ? compressionTimes.slice(-4) 
    : compressionTimes;

  if (recentTimes.length < 2) {
    return previousBPM;
  }

  // Calculate intervals between compressions
  const intervals: number[] = [];
  for (let i = 1; i < recentTimes.length; i++) {
    const interval = (recentTimes[i] - recentTimes[i - 1]) / 1000; // Convert to seconds
    if (interval > 0 && interval < 2.0) { // Valid interval (30-120 BPM range)
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return previousBPM;
  }

  // Calculate average interval and convert to BPM
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  let bpm = 60 / avgInterval;

  // Smooth the BPM calculation to reduce noise (weighted average: 70% new, 30% previous)
  if (previousBPM > 0) {
    bpm = 0.7 * bpm + 0.3 * previousBPM;
  }

  // Clamp between 0-200 BPM
  return Math.min(Math.max(Math.round(bpm), 0), 200);
}

/**
 * Calculate compression depth in millimeters
 * Uses shoulder width for calibration
 * @param shoulderY Average Y position of shoulders (top reference)
 * @param handY Y position of hand midpoint (compression point)
 * @param shoulderWidth Shoulder width in pixels (for calibration)
 * @param pxToMM Pixel to millimeter conversion factor (default 0.3)
 * @returns Compression depth in millimeters
 */
export function calculateDepth(
  shoulderY: number,
  handY: number,
  shoulderWidth: number,
  pxToMM: number = 0.3
): number {
  if (!shoulderY || !handY || !shoulderWidth) {
    return 0;
  }

  // Depth is the vertical distance from shoulder line to hand
  const depthPx = Math.abs(handY - shoulderY);
  
  // Use shoulder width for better calibration (average shoulder width ~400px = 40cm)
  // Adjust conversion factor based on body size
  const calibratedPxToMM = pxToMM * (shoulderWidth / 400);
  const depthMm = depthPx * calibratedPxToMM;

  return Math.round(depthMm);
}

/**
 * Check hand placement relative to chest center
 * Compares wrist midpoint X position to shoulder midpoint X position
 * @param lw Left wrist keypoint
 * @param rw Right wrist keypoint
 * @param ls Left shoulder keypoint
 * @param rs Right shoulder keypoint
 * @returns Placement status, offset ratio, and feedback
 */
export function checkHandPlacement(
  lw: Keypoint,
  rw: Keypoint,
  ls: Keypoint,
  rs: Keypoint
): HandPlacementResult {
  if (!lw || !rw || !ls || !rs) {
    const feedback = {
      message: 'Hand placement not detected',
      priority: 4 as const,
      color: 'red' as const,
    };
    return { placement: 'Off-center', offsetRatio: 1.0, feedback };
  }

  // Get feedback using placement rules
  const feedback = HandPlacementRules.getPlacementFeedback(lw, rw, ls, rs);

  // Calculate midpoints
  const wristMidX = (lw.x + rw.x) / 2;
  const shoulderMidX = (ls.x + rs.x) / 2;

  // Calculate shoulder width for normalization
  const shoulderWidth = Math.abs(rs.x - ls.x);
  
  if (shoulderWidth === 0) {
    return { placement: 'Off-center', offsetRatio: 1.0, feedback };
  }

  // Calculate offset and normalize by shoulder width
  const offset = Math.abs(wristMidX - shoulderMidX);
  const offsetRatio = offset / shoulderWidth;

  // Good placement if offset ratio <= 0.15 (15% of shoulder width)
  const placement: 'Good' | 'Off-center' = offsetRatio <= 0.15 ? 'Good' : 'Off-center';

  return { placement, offsetRatio, feedback };
}

/**
 * Calculate all CPR metrics from pose keypoints
 * Simplified approach based on Python implementation
 */
export function calculateCPRMetrics(
  leftWrist: Keypoint | null,
  rightWrist: Keypoint | null,
  leftShoulder: Keypoint | null,
  rightShoulder: Keypoint | null,
  compressionTimes: number[],
  compressionCount: number,
  depthHistory: number[],
  previousBPM: number = 0
): CPRMetrics {
  let bpm = 0;
  let depthMm = 0;
  let placement: 'Good' | 'Off-center' = 'Off-center';
  let rateFeedback: CPRFeedback = {
    message: 'Waiting for compressions...',
    priority: 0,
    color: 'green',
  };
  let depthFeedback: CPRFeedback = {
    message: 'Waiting for compressions...',
    priority: 0,
    color: 'green',
  };
  let placementFeedback: CPRFeedback = {
    message: 'Position hands on chest',
    priority: 2,
    color: 'orange',
  };

  if (leftWrist && rightWrist && leftShoulder && rightShoulder) {
    // Calculate BPM from compression times
    bpm = calculateBPM(compressionTimes, previousBPM);

    // Get rate feedback
    rateFeedback = CompressionRateRules.getRateFeedback(bpm, compressionCount);

    // Calculate depth
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const handY = (leftWrist.y + rightWrist.y) / 2;
    const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
    depthMm = calculateDepth(shoulderY, handY, shoulderWidth, 0.3);

    // Get average depth for consistency check
    const recentDepths = depthHistory.slice(-CompressionDepthRules.DEPTH_CONSISTENCY_WINDOW);
    const averageDepth = recentDepths.length > 0
      ? recentDepths.reduce((a, b) => a + b, 0) / recentDepths.length
      : depthMm;

    // Get depth feedback
    depthFeedback = CompressionDepthRules.getDepthFeedback(
      depthMm,
      averageDepth,
      shoulderWidth * 0.3 // Convert to mm estimate
    );

    // Check hand placement
    const placementResult = checkHandPlacement(
      leftWrist,
      rightWrist,
      leftShoulder,
      rightShoulder
    );
    placement = placementResult.placement;
    placementFeedback = placementResult.feedback;
  }

  // Get overall feedback
  const overallFeedback = getOverallFeedback(rateFeedback, depthFeedback, placementFeedback);

  return {
    bpm,
    depthMm,
    placement,
    compressionCount,
    rateFeedback,
    depthFeedback,
    placementFeedback,
    overallFeedback,
  };
}
