/**
 * Walkthrough Mode Component
 * Step-by-step CPR instructions
 */

import { useState } from 'react';
import { CameraFeed, CPRMetrics } from './CameraFeed';
import { FeedbackPanel } from './FeedbackPanel';
import { CompressionCounter } from './CompressionCounter';
import { Metronome } from './Metronome';
import { UploadMock } from './UploadMock';

type WalkthroughStep =
  | 'welcome'
  | 'check'
  | 'call'
  | 'position'
  | 'compressions'
  | 'breaths'
  | 'continue';

interface WalkthroughModeProps {
  onSkipToCompressions: () => void;
  onBack: () => void;
}

export function WalkthroughMode({ onSkipToCompressions, onBack }: WalkthroughModeProps) {
  const [currentStep, setCurrentStep] = useState<WalkthroughStep>('welcome');
  const [metrics, setMetrics] = useState<CPRMetrics | null>(null);
  const [compressionCount, setCompressionCount] = useState(0);

  const steps: Record<WalkthroughStep, { title: string; instructions: string[] }> = {
    welcome: {
      title: 'CPR Training',
      instructions: [
        'Learn proper CPR step by step',
        'Follow the instructions on each screen',
        'Click "Next Step" to continue',
      ],
    },
    check: {
      title: 'Check Responsiveness',
      instructions: [
        'Tap their shoulder',
        'Shout "Are you okay?"',
        'If no response, continue',
      ],
    },
    call: {
      title: 'Call 911',
      instructions: [
        'Call 911 immediately',
        'Get an AED if available',
        'Start CPR right away',
      ],
    },
    position: {
      title: 'Hand Position',
      instructions: [
        'Place hands in center of chest',
        'One hand on top of the other',
        'Keep arms straight',
      ],
    },
    compressions: {
      title: 'Perform Compressions',
      instructions: [
        'Push hard and fast',
        'Aim for 120 compressions per minute',
        'Compress 2 inches deep',
        'Let chest fully rebound',
      ],
    },
    breaths: {
      title: 'Rescue Breaths (Optional)',
      instructions: [
        'After 30 compressions, give 2 breaths',
        'Tilt head back, lift chin',
        'Pinch nose and breathe for 1 second',
        'If not trained, continue hands-only CPR',
      ],
    },
    continue: {
      title: 'Continue CPR',
      instructions: [
        'Keep doing 30 compressions',
        'Give 2 breaths if trained',
        'Continue until help arrives',
      ],
    },
  };

  const handleMetricsUpdate = (newMetrics: CPRMetrics) => {
    setMetrics(newMetrics);
    setCompressionCount(newMetrics.compressionCount);
  };

  const handleNext = () => {
    const stepOrder: WalkthroughStep[] = [
      'welcome',
      'check',
      'call',
      'position',
      'compressions',
      'breaths',
      'continue',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const stepOrder: WalkthroughStep[] = [
      'welcome',
      'check',
      'call',
      'position',
      'compressions',
      'breaths',
      'continue',
    ];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const step = steps[currentStep];
  const showCamera = currentStep === 'compressions' || (currentStep as WalkthroughStep) === 'continue';

  return (
    <div className="w-full h-screen overflow-hidden bg-black relative">
      {/* Warning text - top left */}
      <div className="absolute top-2 left-2 z-50 text-red-500 text-xs font-semibold">
        Training app—call 911 in real emergencies
      </div>

      {/* Skip button */}
      {currentStep !== 'compressions' && currentStep !== 'continue' && (
        <button
          onClick={onSkipToCompressions}
          className="absolute top-2 right-2 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold backdrop-blur-sm"
        >
          Skip to Compressions
        </button>
      )}

      {/* Back button when in practice */}
      {showCamera && (
        <button
          onClick={onBack}
          className="absolute top-2 right-2 z-50 px-4 py-2 bg-gray-800/80 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-semibold backdrop-blur-sm"
        >
          Back to Menu
        </button>
      )}

      {/* Camera view (only during compressions) */}
      {showCamera ? (
        <>
          <CameraFeed onMetricsUpdate={handleMetricsUpdate} />
          {metrics && <FeedbackPanel metrics={metrics} />}
          <CompressionCounter count={compressionCount} target={30} />
          <Metronome
            targetBPM={120}
            currentBPM={metrics?.bpm || 0}
            isActive={true}
            audioEnabled={true}
          />
        </>
      ) : (
        /* Instruction overlay */
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border-2 border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-4">{step.title}</h2>
              <div className="space-y-3 text-left">
                {step.instructions.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-3 text-blue-100">
                    <span className="text-blue-400 font-bold mt-1">{index + 1}.</span>
                    <p className="flex-1">{instruction}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 'welcome'}
                className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                {currentStep === 'continue' as WalkthroughStep ? 'Start Practice' : 'Next Step'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadMock />
    </div>
  );
}

