/**
 * Visual Metronome Component
 * Pulses at target BPM rate to guide compression rhythm
 * Can play audio beeps in walkthrough mode
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { audioMetronome } from '../utils/audioMetronome';

interface MetronomeProps {
  targetBPM: number; // Target BPM (100-120)
  currentBPM: number;
  isActive: boolean;
  audioEnabled?: boolean; // Enable audio beeps (for walkthrough mode)
}

export function Metronome({ targetBPM, currentBPM, isActive, audioEnabled = false }: MetronomeProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isActive || targetBPM === 0) {
      setPulse(false);
      if (audioEnabled) {
        audioMetronome.stop();
      }
      return;
    }

    // Start audio metronome if enabled
    if (audioEnabled) {
      audioMetronome.start(targetBPM).catch((error) => {
        console.warn('Could not start audio metronome:', error);
      });
    } else {
      audioMetronome.stop();
    }

    // Calculate interval in milliseconds (beats per minute to ms)
    const intervalMs = (60 / targetBPM) * 1000;

    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 100); // Pulse duration
    }, intervalMs);

    return () => {
      clearInterval(interval);
      if (audioEnabled) {
        audioMetronome.stop();
      }
    };
  }, [targetBPM, isActive, audioEnabled]);

  // Always show visual metronome when active, audio is handled separately
  if (!isActive) {
    return null;
  }

  const bpmDiff = Math.abs(currentBPM - targetBPM);
  const isOnBeat = currentBPM > 0 && bpmDiff <= 10; // Consider "on beat" if within 10 BPM

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex flex-col items-center">
        {/* Metronome pulse indicator with aura */}
        <motion.div
          animate={{
            scale: pulse ? [1, 1.3, 1] : 1,
            opacity: pulse ? [1, 0.8, 1] : 0.6,
            boxShadow: pulse
              ? [
                  `0 0 20px ${isOnBeat ? 'rgba(34, 197, 94, 0.5)' : 'rgba(249, 115, 22, 0.5)'}`,
                  `0 0 40px ${isOnBeat ? 'rgba(34, 197, 94, 0.5)' : 'rgba(249, 115, 22, 0.5)'}`,
                  `0 0 20px ${isOnBeat ? 'rgba(34, 197, 94, 0.5)' : 'rgba(249, 115, 22, 0.5)'}`,
                ]
              : `0 0 10px ${isOnBeat ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)'}`,
          }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={`w-16 h-16 rounded-full border-4 ${
            isOnBeat
              ? 'bg-green-500/30 border-green-400'
              : 'bg-orange-500/30 border-orange-400'
          } flex items-center justify-center backdrop-blur-sm`}
          style={{
            boxShadow: `0 0 15px ${isOnBeat ? 'rgba(34, 197, 94, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`,
          }}
        >
          <div
            className={`w-8 h-8 rounded-full ${
              isOnBeat ? 'bg-green-400' : 'bg-orange-400'
            }`}
          />
        </motion.div>

        {/* BPM indicator */}
        <div className="mt-2 text-center">
          <div className="text-xs text-gray-300 mb-1">Target: {targetBPM} BPM</div>
          <div className="text-sm font-semibold text-white">
            Current: {currentBPM || '--'} BPM
          </div>
          {audioEnabled && (
            <div className="text-xs text-blue-400 mt-1">Audio: ON</div>
          )}
        </div>
      </div>
    </div>
  );
}

