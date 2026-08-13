import { useAuth } from '../lib/AuthContext'

export default function InspectorDashboard() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-[#0F4C81] px-6 py-4 text-white">
        <h1 className="font-semibold">Inspector Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm">Hi, {profile?.username}</span>
          <button
            onClick={signOut}
            className="rounded-md bg-[#CE1126] px-3 py-1 text-sm font-medium hover:bg-[#A50E1F]"
          >
            Log Out
          </button>
        </div>
      </header>
      <main className="p-6">
        <p className="text-[#3A6EA0]">
          Inspection assignments, site verification, and photo uploads will go here in the next modules.
        </p>
      </main>
    </div>
  )
}