'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import HomeIcon from '@mui/icons-material/Home';
import FolderIcon from '@mui/icons-material/Folder';
import BarChartIcon from '@mui/icons-material/BarChart';
import BoltIcon from '@mui/icons-material/Bolt';

interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
  icon?: string;
}

const iconMap = {
  home: HomeIcon,
  folder: FolderIcon,
  barChart: BarChartIcon,
  bolt: BoltIcon,
};

const menuItems: MenuItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: 'home',
  },
  {
    label: 'Execution Plans',
    icon: 'folder',
    children: [
      { label: 'Plans List', href: '/executionplans' },
      { label: 'Load Tests', href: '/load-tests' },
    ],
  },
  {
    label: 'Metrics',
    icon: 'barChart',
    children: [
      { label: 'Dashboard', href: '/dashboard' },
    ],
  },
];

export function Sidebar() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['Test Endpoints', 'Metrics'])
  );

  // Hide sidebar if still loading or not logged in
  if (loading || !user) return null;

  // Logo style variables
  const logoTextClass = 'text-2xl font-bold text-white';
  const logoIconClass = 'text-3xl text-white';

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
      {/* Logo/Title in normal flow */}
      <div className="mb-8 pb-4 border-b border-gray-700">
        <Link href="/" className="flex items-center gap-2 group">
          <BoltIcon className={logoIconClass} />
          <span className={logoTextClass + ' group-hover:text-blue-400 transition'}>ApiMetrics</span>
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
                {item.icon && (() => {
                  const IconComponent = iconMap[item.icon as keyof typeof iconMap];
                  return <IconComponent className="text-lg" />;
                })()}
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
                    {item.icon && (() => {
                      const IconComponent = iconMap[item.icon as keyof typeof iconMap];
                      return <IconComponent className="text-lg" />;
                    })()}
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
