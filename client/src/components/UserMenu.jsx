import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

function Avatar({ name }) {
  const letter = name ? name.charAt(0).toUpperCase() : '?'
  return (
    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">{letter}</div>
  )
}

export default function UserMenu() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((s) => !s)} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200">
        <Avatar name={user?.name || user?.email} />
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-sm font-medium text-gray-800">{user?.name || user?.email}</span>
          <span className="text-xs text-gray-500">Member</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md border border-gray-100 shadow-md overflow-hidden z-20">
          <button onClick={() => { setOpen(false); navigate('/health-profile') }} className="w-full text-left px-4 py-2 hover:bg-gray-50">Health Profile</button>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-gray-50">Logout</button>
        </div>
      )}
    </div>
  )
}
