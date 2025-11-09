'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BuildIcon from '@mui/icons-material/Build';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import LockIcon from '@mui/icons-material/Lock';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';

const iconMap = {
  rocket: RocketLaunchIcon,
  analytics: AnalyticsIcon,
  build: BuildIcon,
  trendingUp: TrendingUpIcon,
  lock: LockIcon,
  bolt: BoltIcon,
};

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  const features = [
    {
      icon: 'rocket',
      title: 'Load Testing',
      description: 'Run performance tests on your APIs with configurable load patterns and concurrent users.'
    },
    {
      icon: 'analytics',
      title: 'Real-time Metrics',
      description: 'Monitor latency, throughput, success rates, and error patterns in real-time dashboards.'
    },
    {
      icon: 'build',
      title: 'Endpoint Management',
      description: 'Easily manage and organize your test endpoints with support for all HTTP methods.'
    },
    {
      icon: 'trendingUp',
      title: 'Performance Analytics',
      description: 'Deep insights into P95, P99 latency, and performance trends over time.'
    },
    {
      icon: 'lock',
      title: 'Multi-tenant Support',
      description: 'Organize tests by tenant with secure isolation and role-based access control.'
    },
    {
      icon: 'bolt',
      title: 'Fast & Reliable',
      description: 'Built on modern infrastructure for lightning-fast test execution and accurate results.'
    }
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: 'Free',
      description: 'Perfect for small projects and testing',
      features: [
        '10 endpoints',
        '100 tests per month',
        'Basic metrics',
        'Email support'
      ],
      cta: 'Get Started',
      highlighted: false
    },
    {
      name: 'Professional',
      price: '$49',
      period: '/month',
      description: 'For growing teams and production apps',
      features: [
        'Unlimited endpoints',
        'Unlimited tests',
        'Advanced analytics',
        'Priority support',
        'Custom reports',
        'API access'
      ],
      cta: 'Start Free Trial',
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For large-scale deployments',
      features: [
        'Everything in Professional',
        'Dedicated infrastructure',
        'SLA guarantees',
        '24/7 phone support',
        'Custom integrations',
        'Training & onboarding'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Logo at top left only when not logged in (no sidebar) */}
      {!user && (
        <div className="absolute top-0 left-0 p-6 z-20">
          <Link href="/" className="flex items-center gap-2 group">
            <BoltIcon className="text-3xl text-blue-600" />
            <span className="text-2xl font-bold text-blue-700 group-hover:text-blue-400 transition">ApiMetrics</span>
          </Link>
        </div>
      )}
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <BoltIcon className="text-8xl text-blue-600" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              API Load Testing
              <span className="block text-blue-600 mt-2">Made Simple</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Test your APIs under load, monitor performance metrics, and ensure reliability 
              before your users experience issues. Built for developers who care about performance.
            </p>
            <div className="flex gap-4 justify-center">
              {user ? (
                <>
                  <Link
                    href="/endpoints"
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                  >
                    Go to Dashboard
                  </Link>
                  <Link
                    href="/load-tests"
                    className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
                  >
                    Run Load Test
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                  >
                    Get Started Free
                  </Link>
                  <a
                    href="#pricing"
                    className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition border-2 border-blue-600"
                  >
                    View Pricing
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Everything you need for API testing
          </h2>
          <p className="text-xl text-gray-600">
            Powerful features to help you test, monitor, and optimize your APIs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition border border-gray-100"
            >
              <div className="text-5xl mb-4 text-blue-600">
                {(() => {
                  const IconComponent = iconMap[feature.icon as keyof typeof iconMap];
                  return <IconComponent fontSize="inherit" />;
                })()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs. Always know what you'll pay.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`rounded-xl p-8 ${
                  plan.highlighted
                    ? 'bg-blue-600 text-white shadow-2xl scale-105 border-4 border-blue-700'
                    : 'bg-gray-50 text-gray-900 shadow-lg border border-gray-200'
                }`}
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`mb-4 ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className={`text-xl ${plan.highlighted ? 'text-blue-100' : 'text-gray-600'}`}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-3">
                      <CheckIcon className={`text-xl ${plan.highlighted ? 'text-blue-200' : 'text-green-500'}`} />
                      <span className={plan.highlighted ? 'text-blue-50' : 'text-gray-700'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => router.push(user ? '/endpoints' : '/login')}
                  className={`w-full py-4 px-6 rounded-lg font-semibold transition ${
                    plan.highlighted
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to test your APIs?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers who trust ApiMetrics for their load testing needs
          </p>
          <Link
            href={user ? '/endpoints' : '/login'}
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
          >
            {user ? 'Go to Dashboard' : 'Start Testing Now'}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BoltIcon className="text-3xl text-blue-600" />
                <span className="text-2xl font-bold text-blue-700">ApiMetrics</span>
              </div>
              <p className="text-gray-400">
                Professional API load testing and monitoring platform
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/endpoints" className="hover:text-white transition">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition">Pricing</Link></li>
                <li><Link href="/load-tests" className="hover:text-white transition">Load Tests</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ApiMetrics. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


