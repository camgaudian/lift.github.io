import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/AppLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { SignUpPage } from '@/features/auth/SignUpPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { WorkoutPage } from '@/features/workouts/WorkoutPage'
import { ActiveWorkoutPage } from '@/features/workouts/ActiveWorkoutPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { StatsPage } from '@/features/stats/StatsPage'
import { LibraryPage } from '@/features/library/LibraryPage'
import { TemplateDetailPage } from '@/features/templates/TemplateDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workout" element={<WorkoutPage />} />
            <Route path="/workout/:id" element={<ActiveWorkoutPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/library" element={<LibraryPage />}>
              <Route path="templates/:id" element={<TemplateDetailPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
