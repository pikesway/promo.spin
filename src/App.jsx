import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PlatformProvider } from './context/PlatformContext';
import AgencyDashboard from './pages/AgencyDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CampaignPlayer from './pages/CampaignPlayer';

function App() {
  return (
    <PlatformProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/agency" replace />} />
          <Route path="/agency" element={<AgencyDashboard />} />
          <Route path="/client/:clientId" element={<ClientDashboard />} />
          <Route path="/play/:slug" element={<CampaignPlayer />} />
        </Routes>
      </Router>
    </PlatformProvider>
  );
}

export default App;