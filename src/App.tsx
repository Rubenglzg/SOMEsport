import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';

// Admin Pages
import { AdminClubsPage } from './pages/admin/AdminClubsPage';
import { AdminPlayersPage } from './pages/admin/AdminPlayersPage';
import { AdminStatsPage } from './pages/admin/AdminStatsPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSeasonsPage } from './pages/admin/AdminSeasonsPage';

// Club Pages
import { ClubSettingsPage } from './pages/club/ClubSettingsPage';
import { ClubDirectoryPage } from './pages/club/ClubDirectoryPage';
import { ClubDocumentsPage } from './pages/club/ClubDocumentsPage';
import { ClubTeamsPage } from './pages/club/ClubTeamsPage';
import { ClubTreasuryPage } from './pages/club/ClubTreasuryPage';
import { ClubCalendarPage } from './pages/club/ClubCalendarPage';
import { ClubAnnouncementsPage } from './pages/club/ClubAnnouncementsPage';
import { ClubAttendancePage } from './pages/club/ClubAttendancePage';

// Player Pages
import { PlayerDocumentsPage } from './pages/player/PlayerDocumentsPage';
import { PlayerPaymentsPage } from './pages/player/PlayerPaymentsPage';
import { PlayerTeamPage } from './pages/player/PlayerTeamPage';
import { PlayerProfilePage } from './pages/player/PlayerProfilePage';
import { PlayerCalendarPage } from './pages/player/PlayerCalendarPage';
import { PlayerMessagesPage } from './pages/player/PlayerMessagesPage';
import { PlayerHistoryPage } from './pages/player/PlayerHistoryPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardLayout />}>
              {/* Overview / Home — role-aware */}
              <Route index element={<Dashboard />} />

              {/* Admin Routes */}
              <Route path="clubs" element={<AdminClubsPage />} />
              <Route path="players" element={<AdminPlayersPage />} />
              <Route path="stats" element={<AdminStatsPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="seasons" element={<AdminSeasonsPage />} />

              {/* Club Routes */}
              <Route path="my-club" element={<ClubSettingsPage />} />
              <Route path="directory" element={<ClubDirectoryPage />} />
              <Route path="documents" element={<ClubDocumentsPage />} />
              <Route path="teams" element={<ClubTeamsPage />} />
              <Route path="treasury" element={<ClubTreasuryPage />} />
              <Route path="calendar" element={<ClubCalendarPage />} />
              <Route path="club-announcements" element={<ClubAnnouncementsPage />} />
              <Route path="attendance" element={<ClubAttendancePage />} />

              {/* Player Routes */}
              <Route path="my-documents" element={<PlayerDocumentsPage />} />
              <Route path="my-payments" element={<PlayerPaymentsPage />} />
              <Route path="my-team" element={<PlayerTeamPage />} />
              <Route path="my-profile" element={<PlayerProfilePage />} />
              <Route path="my-calendar" element={<PlayerCalendarPage />} />
              <Route path="my-messages" element={<PlayerMessagesPage />} />
              <Route path="my-history" element={<PlayerHistoryPage />} />

              {/* Shared */}
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
