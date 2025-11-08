/**
 * Mode Selection Screen
 * Allows user to choose between Walkthrough Mode and Feedback Mode
 */

interface ModeSelectionProps {
  onSelectMode: (mode: 'walkthrough' | 'feedback') => void;
}

export function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">PulseAI</h1>
          <p className="text-xl text-blue-200">CPR Training Assistant</p>
          <p className="text-sm text-red-400 mt-4 font-semibold">
            Training app—call 911 in real emergencies
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Walkthrough Mode */}
          <button
            onClick={() => onSelectMode('walkthrough')}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20 hover:border-white/40 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/50 transition-colors">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Walkthrough Mode</h2>
              <p className="text-blue-200 text-sm leading-relaxed">
                Step-by-step CPR instructions with guided practice. Perfect for beginners learning
                proper CPR technique.
              </p>
            </div>
          </button>

          {/* Feedback Mode */}
          <button
            onClick={() => onSelectMode('feedback')}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20 hover:border-white/40 hover:bg-white/15 transition-all duration-300 transform hover:scale-105 group"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-500/30 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/50 transition-colors">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Feedback Mode</h2>
              <p className="text-blue-200 text-sm leading-relaxed">
                Real-time CPR feedback with live metrics. Perfect for practicing and improving your
                CPR technique.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-blue-300 text-sm">
          <p>Allow camera access when prompted to begin training</p>
        </div>
      </div>
    </div>
  );
}

