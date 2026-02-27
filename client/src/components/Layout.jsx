import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Home, FileText, MessageCircle, Utensils, Dumbbell, BarChart2, Heart } from 'lucide-react'
import UserMenu from './UserMenu'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent hover:from-indigo-700 hover:to-blue-700 transition-all">
                💪 FitAI
              </Link>
              
              <div className="hidden md:flex space-x-2">
                <Link
                  to="/dashboard"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/dashboard')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                
                <Link
                  to="/plans"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/plans')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Plans
                </Link>
                
                <Link
                  to="/chat"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/chat')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Link>
                
                <Link
                  to="/food-tracker"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/food-tracker')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Utensils className="w-4 h-4 mr-2" />
                  Food
                </Link>
                
                <Link
                  to="/workout-tracker"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/workout-tracker')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Dumbbell className="w-4 h-4 mr-2" />
                  Workout
                </Link>

                <Link
                  to="/analytics"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/analytics')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <BarChart2 className="w-4 h-4 mr-2" />
                  Analytics
                </Link>

                <Link
                  to="/health-profile"
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive('/health-profile')
                      ? 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart className="w-4 h-4 mr-2" />
                  Health
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="section-container">
        <Outlet />
      </main>
    </div>
  )
}

