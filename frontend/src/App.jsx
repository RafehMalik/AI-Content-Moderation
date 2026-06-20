import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedLayout, AdminRoute } from './components/ProtectedRoute'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import SubmitImages from './pages/user/SubmitImages'
import SubmissionHistory from './pages/user/SubmissionHistory'
import SubmissionDetail from './pages/user/SubmissionDetail'
import MyAppeals from './pages/user/MyAppeals'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminAppealQueue from './pages/admin/AdminAppealQueue'
import AdminPolicies from './pages/admin/AdminPolicies'
import AdminSubmissions from './pages/admin/AdminSubmissions'

function RootRedirect() {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={isAdmin ? '/admin' : '/submit'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/submit" element={<SubmitImages />} />
              <Route path="/history" element={<SubmissionHistory />} />
              <Route path="/history/:id" element={<SubmissionDetail />} />
              <Route path="/appeals" element={<MyAppeals />} />

              <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<AdminAnalytics />} />
                <Route path="queue" element={<AdminAppealQueue />} />
                <Route path="submissions" element={<AdminSubmissions />} />
                <Route path="policies" element={<AdminPolicies />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
