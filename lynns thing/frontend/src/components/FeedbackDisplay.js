import React from 'react';

function FeedbackDisplay({ bpm, count, message }) {
  // Determine BPM color based on rate (from cpr app.pdf [cite: 31, 32, 33])
  const getBPMColor = () => {
    if (bpm >= 100 && bpm <= 120) {
      return 'bpm-good'; // Green
    }
    if (bpm > 120) {
      return 'bpm-fast'; // Orange
    }
    if (bpm > 0 && bpm < 100) {
      return 'bpm-slow'; // Red
    }
    return 'bpm-neutral'; // Default
  };

  return (
    <div className="feedback-container">
      {/* Top Banner (from cpr app.pdf [cite: 49]) */}
      <div className="emergency-banner">
        CALL 911!
      </div>

      {/* Main Feedback Message */}
      <div className="feedback-message">
        {message || "No feedback yet."}
      </div>

      {/* Data Readouts */}
      <div className="readout-container">
        <div className={`readout-box ${getBPMColor()}`}>
          <span className="readout-value">{bpm || '--'}</span>
          <span className="readout-label">BPM</span>
        </div>
        <div className="readout-box">
          <span className="readout-value">{count || 0} / 30</span>
          <span className="readout-label">COUNT</span>
        </div>
      </div>
    </div>
  );
}

export default FeedbackDisplay;