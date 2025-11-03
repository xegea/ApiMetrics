'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';

interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
  icon?: string;
}

const menuItems: MenuItem[] = [
  {
    label: 'Home',
    href: '/dashboard',
    icon: '🏠',
  },
  {
    label: 'Test Endpoints',
    icon: '🔧',
    children: [
      { label: 'New Endpoint', href: '/test-endpoints' },
      { label: 'My Endpoints', href: '/list-endpoints' },
    ],
  },
  {
    label: 'Metrics',
    icon: '📊',
    children: [
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Test Endpoints', 'Metrics'])
  );

  const toggleSection = (label: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(label)) {
      newExpanded.delete(label);
    } else {
      newExpanded.add(label);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      {/* Logo/Title */}
      <div className="mb-8 pb-4 border-b border-gray-700">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <span className="text-2xl">⚡</span>
          <h1 className="text-xl font-bold group-hover:text-blue-400 transition">
            ApiMetrics
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <div key={item.label}>
            {/* Direct Link (no children) */}
            {!item.children && item.href && (
              <Link
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-semibold text-gray-200">{item.label}</span>
              </Link>
            )}

            {/* Section Header (with children) */}
            {item.children && (
              <>
                <button
                  onClick={() => toggleSection(item.label)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-800 transition text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-semibold text-gray-200">{item.label}</span>
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedSections.has(item.label) ? 'rotate-90' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>

                {/* Children */}
                {expandedSections.has(item.label) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={`block px-3 py-2 rounded-lg transition ${
                          isActive(child.href!)
                            ? 'bg-blue-600 text-white font-medium'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400 text-center">
          <p>ApiMetrics v0.1.0</p>
          <p className="mt-1">Load Testing Platform</p>
        </div>
      </div>
    </div>
  );
}
