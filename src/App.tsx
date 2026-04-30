/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/AdminDashboard';
import PendingApproval from './pages/PendingApproval';
import BlockedPage from './pages/BlockedPage';
import Layout from './components/Layout';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isAdmin } = useAuth();

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-sititrel-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sititrel-accent border-t-sititrel-blue"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-sititrel-blue/40">SITITREL</p>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;

  // Blocked users can't access anything except maybe public pages
  if (profile?.blocked && !isAdmin) {
    return <Navigate to="/blocked" />;
  }
  
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  
  // Master user bypasses all profile validation
  if (user.email === 'jacksonbjr@gmail.com') return <>{children}</>;

  if (!profile && !adminOnly) {
     return <Navigate to="/login" />;
  }

  if (profile && !profile.approved && !isAdmin) {
    return <Navigate to="/pending" />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending" element={<PendingApproval />} />
        <Route path="/blocked" element={<BlockedPage />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/profile" element={
          <PrivateRoute>
            <Layout>
              <ProfilePage />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <PrivateRoute adminOnly>
            <Layout>
              <AdminDashboard />
            </Layout>
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
