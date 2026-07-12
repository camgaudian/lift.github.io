import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProfileProvider } from '@/contexts/ProfileContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ActiveWorkoutPage } from '@/features/workouts/ActiveWorkoutPage'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { HistoryPage } from '@/features/progress/HistoryPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { PrLeaderboardPage } from '@/features/pr-leaderboard/PrLeaderboardPage'
import { TemplateDetailPage } from '@/features/templates/TemplateDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ThemeProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/workout" element={<Navigate to="/" replace />} />
              <Route path="/workout/:id" element={<ActiveWorkoutPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/library" element={<LibraryPage />}>
                <Route path="templates/:id" element={<TemplateDetailPage />} />
              </Route>
              <Route path="/pr-leaderboard" element={<PrLeaderboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/settings" element={<SettingsPage />} />
              <Route path="/settings" element={<Navigate to="/profile/settings" replace />} />
              <Route path="/stats" element={<Navigate to="/progress" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ThemeProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}
