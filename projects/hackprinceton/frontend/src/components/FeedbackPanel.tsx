/**
 * Feedback Panel Component
 * Displays comprehensive CPR feedback with modern UI and color-coded auras
 */

import { useEffect, useState } from 'react';
import { CPRMetrics } from '../utils/cprLogic';
import { messagePrioritizer } from '../utils/messagePrioritizer';
import { motion } from 'framer-motion';

export interface FeedbackPanelProps {
  metrics: CPRMetrics;
}

export function FeedbackPanel({ metrics }: FeedbackPanelProps) {
  const { bpm, depthMm, placement, rateFeedback, depthFeedback, placementFeedback } = metrics;
  const [prioritizedMessage, setPrioritizedMessage] = useState(
    messagePrioritizer.getCurrentMessage()
  );

  // Update prioritized message - show ONLY ONE message at a time
  useEffect(() => {
    // Determine overall priority from individual feedbacks
    const priorities = [
      { feedback: rateFeedback, name: 'rate' },
      { feedback: depthFeedback, name: 'depth' },
      { feedback: placementFeedback, name: 'placement' },
    ];

    // Sort by priority (highest first)
    priorities.sort((a, b) => b.feedback.priority - a.feedback.priority);

    // Show ONLY the highest priority message (one at a time)
    const topPriority = priorities[0];
    let message = topPriority.feedback.message;
    let color = topPriority.feedback.color;
    const priority = topPriority.feedback.priority;

    // Only show positive message if ALL are good (priority <= 1)
    if (priorities.every(p => p.feedback.priority <= 1)) {
      message = 'Excellent CPR technique! Keep it up!';
      color = 'green';
    }

    const updated = messagePrioritizer.addMessage(message, color, priority);
    setPrioritizedMessage(updated);
  }, [rateFeedback, depthFeedback, placementFeedback]);

  // Periodically check for queued message updates (less frequently)
  useEffect(() => {
    const interval = setInterval(() => {
      const updated = messagePrioritizer.updateFromQueue();
      setPrioritizedMessage(updated);
    }, 1000); // Check every 1 second (slower updates)

    return () => clearInterval(interval);
  }, []);

  // Color mapping for status with auras
  const colorClasses = {
    green: 'bg-green-500/90 border-green-400',
    orange: 'bg-orange-500/90 border-orange-400',
    red: 'bg-red-500/90 border-red-400',
  };

  const textColorClasses = {
    green: 'text-green-100',
    orange: 'text-orange-100',
    red: 'text-red-100',
  };

  const iconColorClasses = {
    green: 'text-green-300',
    orange: 'text-orange-300',
    red: 'text-red-300',
  };

  const auraColors = {
    green: 'rgba(34, 197, 94, 0.3)',
    orange: 'rgba(249, 115, 22, 0.3)',
    red: 'rgba(239, 68, 68, 0.3)',
  };

  return (
    <>
      {/* Main feedback banner - top center with color-coded aura */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 20px ${auraColors[prioritizedMessage.color]}`,
            `0 0 40px ${auraColors[prioritizedMessage.color]}`,
            `0 0 20px ${auraColors[prioritizedMessage.color]}`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-40 px-6 py-4 rounded-xl shadow-2xl border-2 ${colorClasses[prioritizedMessage.color]} ${textColorClasses[prioritizedMessage.color]} backdrop-blur-md min-w-[300px] max-w-[600px]`}
        style={{
          boxShadow: `0 0 30px ${auraColors[prioritizedMessage.color]}`,
        }}
      >
        <div className="flex items-center justify-center gap-3">
          <div className={`text-2xl ${iconColorClasses[prioritizedMessage.color]}`}>
            {prioritizedMessage.color === 'green' && '✓'}
            {prioritizedMessage.color === 'orange' && '⚠'}
            {prioritizedMessage.color === 'red' && '✕'}
          </div>
          <p className="font-semibold text-lg text-center">{prioritizedMessage.message}</p>
        </div>
      </motion.div>

      {/* Metrics cards - bottom corners with auras */}
      <div className="fixed bottom-4 left-4 z-40 space-y-3">
        {/* BPM Card */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 15px ${auraColors[rateFeedback.color]}`,
              `0 0 25px ${auraColors[rateFeedback.color]}`,
              `0 0 15px ${auraColors[rateFeedback.color]}`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[160px]"
          style={{
            boxShadow: `0 0 20px ${auraColors[rateFeedback.color]}`,
            borderColor: rateFeedback.color === 'green' ? 'rgba(34, 197, 94, 0.3)' : rateFeedback.color === 'orange' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Rate</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                rateFeedback.color === 'green'
                  ? 'bg-green-500/30 text-green-300'
                  : rateFeedback.color === 'orange'
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-red-500/30 text-red-300'
              }`}
            >
              {rateFeedback.color === 'green' ? 'Good' : rateFeedback.color === 'orange' ? 'Warning' : 'Critical'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{bpm || '--'} BPM</div>
          <div className="text-xs text-gray-400">Target: 100-120 BPM</div>
        </motion.div>

        {/* Depth Card */}
        <motion.div
          animate={{
            boxShadow: [
              `0 0 15px ${auraColors[depthFeedback.color]}`,
              `0 0 25px ${auraColors[depthFeedback.color]}`,
              `0 0 15px ${auraColors[depthFeedback.color]}`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[160px]"
          style={{
            boxShadow: `0 0 20px ${auraColors[depthFeedback.color]}`,
            borderColor: depthFeedback.color === 'green' ? 'rgba(34, 197, 94, 0.3)' : depthFeedback.color === 'orange' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Depth</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                depthFeedback.color === 'green'
                  ? 'bg-green-500/30 text-green-300'
                  : depthFeedback.color === 'orange'
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-red-500/30 text-red-300'
              }`}
            >
              {depthFeedback.color === 'green' ? 'Good' : depthFeedback.color === 'orange' ? 'Warning' : 'Critical'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{depthMm || '--'}mm</div>
          <div className="text-xs text-gray-400">Target: 50-60mm</div>
        </motion.div>
      </div>

      {/* Placement Card - bottom right (above upload button) */}
      <motion.div
        animate={{
          boxShadow: [
            `0 0 15px ${auraColors[placementFeedback.color]}`,
            `0 0 25px ${auraColors[placementFeedback.color]}`,
            `0 0 15px ${auraColors[placementFeedback.color]}`,
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="fixed bottom-36 right-4 z-40"
      >
        <div
          className="bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/20 min-w-[180px]"
          style={{
            boxShadow: `0 0 20px ${auraColors[placementFeedback.color]}`,
            borderColor: placementFeedback.color === 'green' ? 'rgba(34, 197, 94, 0.3)' : placementFeedback.color === 'orange' ? 'rgba(249, 115, 22, 0.3)' : 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Placement</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                placementFeedback.color === 'green'
                  ? 'bg-green-500/30 text-green-300'
                  : placementFeedback.color === 'orange'
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-red-500/30 text-red-300'
              }`}
            >
              {placement === 'Good' ? 'Good' : 'Off-center'}
            </span>
          </div>
          <div
            className={`text-lg font-semibold mb-1 ${
              placement === 'Good' ? 'text-green-400' : 'text-orange-400'
            }`}
          >
            {placement}
          </div>
          <div className="text-xs text-gray-400">{placementFeedback.message}</div>
        </div>
      </motion.div>
    </>
  );
}
