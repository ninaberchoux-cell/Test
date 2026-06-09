import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Link from 'next/link';

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span>✈️</span>
            <span>AI-Powered Vacation Coverage</span>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Never miss an email<br />
            <span className="text-blue-600">while on vacation</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
            Automatically delegate, triage, and track emails with AI. Seamless Microsoft 365 integration so your team stays covered.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/api/auth/signin"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Sign in with Microsoft
            </Link>
            <Link
              href="#features"
              className="text-gray-600 hover:text-gray-900 font-medium px-6 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Learn more
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: '🤖',
              title: 'AI Email Triage',
              desc: 'Automatically classify urgency, summarize content, and generate draft replies using GPT-4.',
            },
            {
              icon: '📧',
              title: 'Auto Delegation',
              desc: 'Instantly forward and assign emails to your backup colleague with full context.',
            },
            {
              icon: '⏰',
              title: 'Smart Reminders',
              desc: 'Escalating reminders via Teams, Outlook, and in-app when emails go unanswered.',
            },
            {
              icon: '📊',
              title: 'Analytics Dashboard',
              desc: 'Track SLA compliance, response times, and coverage performance in real-time.',
            },
            {
              icon: '📋',
              title: 'Return Summary',
              desc: 'AI-generated briefing when you return: what happened, what needs action, suggested follow-ups.',
            },
            {
              icon: '🔒',
              title: 'Enterprise Security',
              desc: 'Multi-tenant, RBAC, GDPR compliant, encrypted token storage, and full audit logs.',
            },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center bg-blue-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to take a real vacation?</h2>
          <p className="text-blue-100 mb-8">Join thousands of Microsoft 365 users who delegate with confidence.</p>
          <Link
            href="/api/auth/signin"
            className="bg-white text-blue-600 font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </main>
  );
}
