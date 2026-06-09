'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/dashboard';

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">✈</div>
          <div>
            <p className="font-bold text-gray-900">Vacation Inbox</p>
            <p className="text-xs text-gray-400">Assistant</p>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2 text-center">Sign in</h1>
        <p className="text-sm text-gray-500 text-center mb-8">Use your Microsoft 365 account</p>

        <button
          onClick={() => signIn('azure-ad', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-[#0078d4] hover:bg-[#106ebe] text-white font-medium py-3 px-4 rounded-xl transition-colors"
        >
          <svg viewBox="0 0 23 23" className="w-5 h-5" fill="white">
            <path d="M1 1h10v10H1zm11 0h10v10H12zM1 12h10v10H1zm11 0h10v10H12z" />
          </svg>
          Sign in with Microsoft
        </button>

        <p className="text-xs text-gray-400 text-center mt-6">
          By signing in you agree to our terms and privacy policy.
        </p>
      </div>
    </main>
  );
}
