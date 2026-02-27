import React from 'react'
import Card from './Card'

export default function StatCard({ title, value, icon = null }) {
  return (
    <Card className="p-4 flex flex-col items-center justify-center text-center">
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl md:text-3xl font-bold mt-1">{value ?? '—'}</div>
    </Card>
  )
}
