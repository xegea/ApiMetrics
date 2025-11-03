'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { SignupModal } from './SignupModal';

export function TopBar() {
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Check for logged in user (from localStorage)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const userEmail = localStorage.getItem('user_email');
      
      if (token && userEmail) {
        setUser({ email: userEmail });
      }
    }
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_email');
      setUser(null);
      setShowUserMenu(false);
    }
  };

  // Get username from email (part before @)
  const getUsername = (email: string) => {
    return email.split('@')[0];
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-end items-center gap-3">
        {user ? (
          // Logged in - show user profile
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              {/* User Icon */}
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <span className="font-medium text-gray-700">{getUsername(user.email)}</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm text-gray-500">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/test-endpoints"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  Test Endpoints
                </Link>
                <Link
                  href="/list-endpoints"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setShowUserMenu(false)}
                >
                  My Endpoints
                </Link>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          // Not logged in - show Login/Sign up buttons
          <>
            <Link
              href="/login"
              className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition"
            >
              Log in
            </Link>
            <button
              onClick={() => setShowSignupModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Sign up
            </button>
          </>
        )}
      </div>

      <SignupModal isOpen={showSignupModal} onClose={() => setShowSignupModal(false)} />
    </>
  );
}
