import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { TeamCreatePage } from './pages/TeamCreatePage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { JoinRequestsPage } from './pages/JoinRequestsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 10000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/discover" element={<DiscoveryPage />} />
                  <Route path="/create-team" element={<TeamCreatePage />} />
                  <Route path="/teams/:id" element={<TeamDetailPage />} />
                  <Route path="/recommendations" element={<RecommendationsPage />} />
                  <Route path="/requests" element={<JoinRequestsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/audit" element={<AuditLogsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
