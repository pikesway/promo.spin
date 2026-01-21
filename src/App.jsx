import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlatformProvider } from './context/PlatformContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './pages/ProfileSettings';
import UserManagement from './pages/UserManagement';
import AgencyDashboard from './pages/AgencyDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CampaignPlayer from './pages/CampaignPlayer';
import RedemptionPage from './pages/RedemptionPage';

function App() {
  return (
    <AuthProvider>
      <PlatformProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/play/:slug" element={<CampaignPlayer />} />
            <Route path="/redeem/:shortCode" element={<RedemptionPage />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileSettings />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agency"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AgencyDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/client/:clientId"
              element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </PlatformProvider>
    </AuthProvider>
  );
}

export default App;