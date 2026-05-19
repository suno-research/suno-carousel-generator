'use client';

import { signIn } from 'next-auth/react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const errorMessage =
    error === 'AccessDenied'
      ? 'Seu email não tem acesso ao gerador. Só emails @suno.com.br podem entrar.'
      : error
      ? 'Erro ao fazer login. Tente de novo.'
      : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-sm w-full shadow-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full bg-black flex items-center justify-center mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/suno-logo.svg" alt="Suno" className="w-9 h-auto" />
          </div>
          <h1 className="text-xl font-bold text-center">Gerador de Carrossel</h1>
          <p className="text-sm text-gray-500 text-center mt-1">Suno Investimentos</p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm mb-4">
            {errorMessage}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 font-medium text-sm"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.61z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.27c-.81.54-1.83.86-3.04.86-2.33 0-4.31-1.58-5.02-3.71H.96v2.33A8.99 8.99 0 0 0 9 18z"
            />
            <path
              fill="#FBBC05"
              d="M3.98 10.7A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.3-1.7V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.02-2.34z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.98 7.3C4.69 5.16 6.67 3.58 9 3.58z"
            />
          </svg>
          Entrar com Google
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          Acesso restrito a contas <code className="text-gray-700">@suno.com.br</code>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <LoginContent />
    </Suspense>
  );
}
