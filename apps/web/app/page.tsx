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
import BucketMetricsChartExample from './components/BucketMetricsChart.example';
import { BucketMetricsChart } from './components/BucketMetricsChart';

// Sample data for the home page chart
const sampleBuckets = [
  {
    id: '1',
    bucketNumber: 1,
    startTime: '2025-11-22T10:00:00Z',
    endTime: '2025-11-22T10:00:10Z',
    totalRequests: 120,
    successCount: 115,
    failureCount: 5,
    avgLatency: 145.5,
    minLatency: 50,
    maxLatency: 320,
    p50Latency: 130,
    p95Latency: 280,
    p99Latency: 310,
    successRate: 95.83,
    bytesIn: 12000,
    bytesOut: 8000,
    statusCodes: { '200': 115, '500': 5 } as Record<string, number>,
    errors: ['Connection timeout'],
  },
  {
    id: '2',
    bucketNumber: 2,
    startTime: '2025-11-22T10:00:10Z',
    endTime: '2025-11-22T10:00:20Z',
    totalRequests: 150,
    successCount: 145,
    failureCount: 5,
    avgLatency: 168.2,
    minLatency: 60,
    maxLatency: 420,
    p50Latency: 155,
    p95Latency: 380,
    p99Latency: 410,
    successRate: 96.67,
    bytesIn: 15000,
    bytesOut: 10000,
    statusCodes: { '200': 145, '500': 5 } as Record<string, number>,
    errors: [],
  },
  {
    id: '3',
    bucketNumber: 3,
    startTime: '2025-11-22T10:00:20Z',
    endTime: '2025-11-22T10:00:30Z',
    totalRequests: 180,
    successCount: 165,
    failureCount: 15,
    avgLatency: 210.8,
    minLatency: 70,
    maxLatency: 650,
    p50Latency: 185,
    p95Latency: 580,
    p99Latency: 640,
    successRate: 91.67,
    bytesIn: 18000,
    bytesOut: 12000,
    statusCodes: { '200': 165, '500': 10, '502': 5 } as Record<string, number>,
    errors: ['Gateway timeout', 'Internal server error'],
  },
  {
    id: '4',
    bucketNumber: 4,
    startTime: '2025-11-22T10:00:30Z',
    endTime: '2025-11-22T10:00:40Z',
    totalRequests: 200,
    successCount: 190,
    failureCount: 10,
    avgLatency: 192.3,
    minLatency: 55,
    maxLatency: 480,
    p50Latency: 170,
    p95Latency: 420,
    p99Latency: 470,
    successRate: 95.0,
    bytesIn: 20000,
    bytesOut: 15000,
    statusCodes: { '200': 190, '500': 8, '503': 2 } as Record<string, number>,
    errors: ['Service unavailable'],
  },
  {
    id: '5',
    bucketNumber: 5,
    startTime: '2025-11-22T10:00:40Z',
    endTime: '2025-11-22T10:00:50Z',
    totalRequests: 220,
    successCount: 210,
    failureCount: 10,
    avgLatency: 175.5,
    minLatency: 45,
    maxLatency: 390,
    p50Latency: 160,
    p95Latency: 350,
    p99Latency: 380,
    successRate: 95.45,
    bytesIn: 22000,
    bytesOut: 16000,
    statusCodes: { '200': 210, '500': 10 } as Record<string, number>,
    errors: [],
  },
];

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
      description: 'Monitor latency, throughput, success rates, and error patterns in real-time test executions.'
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
                    href="/loadtestsexecutions"
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                  >
                    Go to Test Executions
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

      {/* Load Test Graph Example Section */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              See Your API Performance in Action
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Real-time metrics visualization with latency percentiles, success rates, and throughput
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 shadow-lg">
            <div className="mb-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Sample Load Test Results</h3>
              <p className="text-sm text-gray-600">30-second test with 10 RPS showing P50, P95, P99 latency and success rates</p>
            </div>

            {/* Sample Chart - Real Interactive Component */}
            <div className="bg-gray-950 rounded-lg p-4 border border-gray-800" style={{ height: '300px' }}>
              <BucketMetricsChart buckets={sampleBuckets} />
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500 mb-3">
                Charts update in real-time during test execution with 5-second buckets
              </p>
              <Link
                href={user ? '/loadtestsexecutions' : '/login'}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-sm"
              >
                <AnalyticsIcon />
                {user ? 'View Your Test Results' : 'Start Your First Test'}
              </Link>
            </div>
          </div>
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
            href={user ? '/loadtestsexecutions' : '/login'}
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg hover:shadow-xl"
          >
            {user ? 'Go to Test Executions' : 'Start Testing Now'}
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


