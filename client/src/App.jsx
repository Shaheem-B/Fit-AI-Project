import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Plans from './pages/Plans'
import Chat from './pages/Chat'
import FoodTracker from './pages/FoodTracker'
import WorkoutTracker from './pages/WorkoutTracker'
import ProgressAnalytics from './pages/ProgressAnalytics'
import HealthProfile from './pages/HealthProfile'
import HealthAwareness from './pages/HealthAwareness'
import Layout from './components/Layout'

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/plans" element={isAuthenticated ? <Plans /> : <Navigate to="/login" />} />
          <Route path="/chat" element={isAuthenticated ? <Chat /> : <Navigate to="/login" />} />
          <Route path="/food-tracker" element={isAuthenticated ? <FoodTracker /> : <Navigate to="/login" />} />
        <Route path="/workout-tracker" element={isAuthenticated ? <WorkoutTracker /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={isAuthenticated ? <ProgressAnalytics /> : <Navigate to="/login" />} />
          <Route path="/health-profile" element={isAuthenticated ? <HealthProfile /> : <Navigate to="/login" />} />
          <Route path="/health-awareness" element={isAuthenticated ? <HealthAwareness /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App

