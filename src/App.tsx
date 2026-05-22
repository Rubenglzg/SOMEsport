import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingPage from './pages/landing/LandingPage';
import PrivacyPolicy from './pages/landing/PrivacyPolicy';
import Terms from './pages/landing/Terms';
import Cookies from './pages/landing/Cookies';

// Admin Pages
import { AdminClubsPage } from './pages/admin/AdminClubsPage';
import { AdminPlayersPage } from './pages/admin/AdminPlayersPage';
import { AdminStatsPage } from './pages/admin/AdminStatsPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminSeasonsPage } from './pages/admin/AdminSeasonsPage';
import { AdminTreasuryPage } from './pages/admin/AdminTreasuryPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { UserSupportPage } from './pages/shared/UserSupportPage';

// Club Pages
import { ClubSettingsPage } from './pages/club/ClubSettingsPage';
import { ClubDirectoryPage } from './pages/club/ClubDirectoryPage';
import { ClubStaffPage } from './pages/club/ClubStaffPage';
import { ClubDocumentsPage } from './pages/club/ClubDocumentsPage';
import { ClubTeamsPage } from './pages/club/ClubTeamsPage';
import { ClubTreasuryPage } from './pages/club/ClubTreasuryPage';
import { ClubCalendarPage } from './pages/club/ClubCalendarPage';
import { ClubAnnouncementsPage } from './pages/club/ClubAnnouncementsPage';
import { ClubAttendancePage } from './pages/club/ClubAttendancePage';
import { ClubFacilitiesPage } from './pages/club/ClubFacilitiesPage';
import { ClubSeasonsPage } from './pages/club/ClubSeasonsPage';
import { ClubInjuriesPage } from './pages/club/ClubInjuriesPage';
import { ClubInventoryPage } from './pages/club/ClubInventoryPage';

// Player Pages
import { PlayerDocumentsPage } from './pages/player/PlayerDocumentsPage';
import { PlayerPaymentsPage } from './pages/player/PlayerPaymentsPage';
import { PlayerTeamPage } from './pages/player/PlayerTeamPage';
import { PlayerProfilePage } from './pages/player/PlayerProfilePage';
import { PlayerCalendarPage } from './pages/player/PlayerCalendarPage';
import { PlayerMessagesPage } from './pages/player/PlayerMessagesPage';
import { PlayerHistoryPage } from './pages/player/PlayerHistoryPage';
import { PlayerMedicalPage } from './pages/player/PlayerMedicalPage';
import { VersionGuard } from './components/VersionGuard';
import { PublicRegistrationPage } from './pages/public/PublicRegistrationPage';
import { ToastContainer } from './components/ToastContainer';

function App() {
  return (
    <VersionGuard>
      <AuthProvider>
        <Router>
          <ToastContainer />
          <Routes>
          {/* Public Landing Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacidad" element={<PrivacyPolicy />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/inscribirse/:clubId" element={<PublicRegistrationPage />} />
          
          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              {/* Overview / Home — role-aware */}
              <Route index element={<Dashboard />} />

              {/* Admin Routes */}
              <Route path="clubs" element={<AdminClubsPage />} />
              <Route path="players" element={<AdminPlayersPage />} />
              <Route path="stats" element={<AdminStatsPage />} />
              <Route path="activity" element={<AdminActivityPage />} />
              <Route path="announcements" element={<AdminAnnouncementsPage />} />
              <Route path="seasons" element={<AdminSeasonsPage />} />
              <Route path="treasury-control" element={<AdminTreasuryPage />} />
              <Route path="support" element={<AdminSupportPage />} />

              {/* Club Routes */}
              <Route path="my-club" element={<ClubSettingsPage />} />
              <Route path="directory" element={<ClubDirectoryPage />} />
              <Route path="staff" element={<ClubStaffPage />} />
              <Route path="documents" element={<ClubDocumentsPage />} />
              <Route path="teams" element={<ClubTeamsPage />} />
              <Route path="treasury" element={<ClubTreasuryPage />} />
              <Route path="calendar" element={<ClubCalendarPage />} />
              <Route path="club-announcements" element={<ClubAnnouncementsPage />} />
              <Route path="attendance" element={<ClubAttendancePage />} />
              <Route path="facilities" element={<ClubFacilitiesPage />} />
              <Route path="club-seasons" element={<ClubSeasonsPage />} />
              <Route path="injuries" element={<ClubInjuriesPage />} />
              <Route path="inventory" element={<ClubInventoryPage />} />

              {/* Player Routes */}
              <Route path="my-documents" element={<PlayerDocumentsPage />} />
              <Route path="my-payments" element={<PlayerPaymentsPage />} />
              <Route path="my-team" element={<PlayerTeamPage />} />
              <Route path="my-profile" element={<PlayerProfilePage />} />
              <Route path="my-calendar" element={<PlayerCalendarPage />} />
              <Route path="my-messages" element={<PlayerMessagesPage />} />
              <Route path="my-history" element={<PlayerHistoryPage />} />
              <Route path="my-medical" element={<PlayerMedicalPage />} />

              {/* Shared */}
              <Route path="settings" element={<Settings />} />
              <Route path="helpdesk" element={<UserSupportPage />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
    </VersionGuard>
  );
}

export default App;
