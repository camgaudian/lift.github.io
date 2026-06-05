import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WorkoutPage } from '@/features/workouts/WorkoutPage'
import { ActiveWorkoutPage } from '@/features/workouts/ActiveWorkoutPage'
import { ProgressPage } from '@/features/progress/ProgressPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TemplateDetailPage } from '@/features/templates/TemplateDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/workout/:id" element={<ActiveWorkoutPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/library" element={<LibraryPage />}>
                <Route path="templates/:id" element={<TemplateDetailPage />} />
              </Route>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/history" element={<Navigate to="/progress" replace />} />
              <Route path="/stats" element={<Navigate to="/progress" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  )
}
