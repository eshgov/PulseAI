import React from 'react';
import { Link } from 'react-router-dom';

function ModeSelection() {
  return (
    <div className="mode-selection">
      <h1>CPR Assistant</h1>
      <p>Please select your experience level.</p>
      
      <Link to="/cpr?mode=walkthrough" className="mode-button">
        <strong>Walkthrough Mode</strong>
        <span>Step-by-step guidance for untrained users</span>
      </Link>
      
      <Link to="/cpr?mode=feedback" className="mode-button">
        <strong>Feedback Mode</strong>
        <span>Immediate feedback for trained responders</span>
      </Link>
    </div>
  );
}

export default ModeSelection;