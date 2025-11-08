/**
 * Feedback Mode Component
 * Real-time CPR feedback with live metrics
 */

import { useState } from 'react';
import { CameraFeed, CPRMetrics } from './CameraFeed';
import { FeedbackPanel } from './FeedbackPanel';
import { CompressionCounter } from './CompressionCounter';
import { Metronome } from './Metronome';
import { UploadMock } from './UploadMock';

interface FeedbackModeProps {
  onBack: () => void;
}

export function FeedbackMode({ onBack }: FeedbackModeProps) {
  const [metrics, setMetrics] = useState<CPRMetrics | null>(null);
  const [compressionCount, setCompressionCount] = useState(0);

  const handleMetricsUpdate = (newMetrics: CPRMetrics) => {
    setMetrics(newMetrics);
    setCompressionCount(newMetrics.compressionCount);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {/* Warning text - top left */}
      <div className="absolute top-2 left-2 z-50 text-red-500 text-xs font-semibold">
        Training app—call 911 in real emergencies
      </div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-2 right-2 z-50 px-4 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold backdrop-blur-sm"
      >
        Back to Menu
      </button>

      {/* Camera feed with pose detection */}
      <CameraFeed onMetricsUpdate={handleMetricsUpdate} />

      {/* Feedback panel */}
      {metrics && <FeedbackPanel metrics={metrics} />}

      {/* Compression counter */}
      <CompressionCounter count={compressionCount} target={30} />

      {/* Metronome - visual only, no audio */}
      <Metronome
        targetBPM={120}
        currentBPM={metrics?.bpm || 0}
        isActive={true}
        audioEnabled={false}
      />

      {/* Upload mock button */}
      <UploadMock />
    </div>
  );
}

