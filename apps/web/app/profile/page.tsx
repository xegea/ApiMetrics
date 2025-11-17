"use client";

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    // Redirect to login after logout
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Not signed in. Please <Link href="/login" className="text-indigo-600 hover:text-indigo-800">login</Link>.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-4">
              <Link href="/loadtestsexecutions" className="text-gray-600 hover:text-gray-900">← Back to Executions</Link>
              <h1 className="text-xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Information</h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-lg font-medium text-gray-800">{user.email ?? '—'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="text-sm font-medium text-gray-800">{user.id}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Metadata</p>
              <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-100">{JSON.stringify(user.user_metadata ?? {}, null, 2)}</pre>
            </div>

            <div>
              <p className="text-sm text-gray-500">App Metadata</p>
              <pre className="text-xs bg-gray-50 p-2 rounded border border-gray-100">{JSON.stringify(user.app_metadata ?? {}, null, 2)}</pre>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Log out
              </button>
              <Link href="/loadtestsexecutions" className="px-4 py-2 bg-gray-100 border rounded hover:bg-gray-200 transition">Back to Executions</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
