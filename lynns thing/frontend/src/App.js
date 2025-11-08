import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ModeSelection from './components/ModeSelection';
import CPRView from './components/CPRView';

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<ModeSelection />} />
        <Route path="/cpr" element={<CPRView />} />
      </Routes>
    </div>
  );
}

export default App;