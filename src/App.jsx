import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlatformProvider } from './context/PlatformContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './pages/ProfileSettings';
import UserManagement from './pages/UserManagement';
import AgencyDashboard from './pages/AgencyDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CampaignPlayer from './pages/CampaignPlayer';
import RedemptionPage from './pages/RedemptionPage';
import LoyaltyCardPage from './pages/LoyaltyCardPage';
import LoyaltyEnrollmentPage from './pages/LoyaltyEnrollmentPage';
import StaffDashboard from './pages/StaffDashboard';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PlatformProvider>
          <Router>
            <AppLayout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/play/:slug" element={<CampaignPlayer />} />
              <Route path="/redeem/:shortCode" element={<RedemptionPage />} />
              <Route path="/loyalty/:campaignSlug" element={<LoyaltyEnrollmentPage />} />
              <Route path="/loyalty/:campaignSlug/:memberCode" element={<LoyaltyCardPage />} />

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

              <Route
                path="/staff"
                element={
                  <ProtectedRoute>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
            </AppLayout>
          </Router>
        </PlatformProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;