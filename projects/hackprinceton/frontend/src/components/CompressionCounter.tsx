/**
 * Compression Counter Component
 * Displays current compression count (X/30)
 */

interface CompressionCounterProps {
  count: number;
  target: number;
}

export function CompressionCounter({ count, target }: CompressionCounterProps) {
  const progress = Math.min((count / target) * 100, 100);
  const isComplete = count >= target;

  return (
    <div className="fixed top-20 right-4 z-50 bg-black/80 backdrop-blur-md rounded-xl p-4 border-2 border-white/20 min-w-[140px]">
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Compressions</div>
        <div className="text-3xl font-bold text-white mb-2">
          <span className={isComplete ? 'text-green-400' : 'text-blue-400'}>
            {count}
          </span>
          <span className="text-gray-500">/{target}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {isComplete && (
          <div className="mt-2 text-xs text-green-400 font-semibold">
            Cycle Complete!
          </div>
        )}
      </div>
    </div>
  );
}

