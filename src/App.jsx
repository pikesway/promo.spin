import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './components/admin/AdminDashboard';
import GamePlayer from './components/game/GamePlayer';
import { GameProvider } from './context/GameContext';
import { LeadProvider } from './context/LeadContext';
import { RedemptionProvider } from './context/RedemptionContext';

function App() {
  return (
    <GameProvider>
      <LeadProvider>
        <RedemptionProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/game/:gameId" element={<GamePlayer />} />
              </Routes>
            </div>
          </Router>
        </RedemptionProvider>
      </LeadProvider>
    </GameProvider>
  );
}

export default App;