'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, XCircle, Loader2, UserCheck, ShieldAlert } from 'lucide-react';
import { confirmUserAccount, rejectUserAccount } from '../actions';
import Link from 'next/link';

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/profile/location';
  
  const [status, setStatus] = useState<'idle' | 'confirming' | 'rejecting' | 'success' | 'rejected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setErrorMessage('Invalid or missing verification link. Please check your email and try again.');
    }
  }, [code]);

  const handleConfirm = async () => {
    if (!code) return;
    setStatus('confirming');
    
    const result = await confirmUserAccount(code);
    if (result.error) {
      setStatus('error');
      setErrorMessage(result.error);
    } else {
      setStatus('success');
      setTimeout(() => {
        router.push(next);
      }, 2000);
    }
  };

  const handleReject = async () => {
    if (!code) return;
    setStatus('rejecting');
    
    const result = await rejectUserAccount(code);
    if (result.error) {
      setStatus('error');
      setErrorMessage(result.error);
    } else {
      setStatus('rejected');
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4 border border-green-100">
          <UserCheck className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Verified!</h1>
        <p className="text-zinc-500 max-w-sm text-sm">
          Your email has been confirmed. Redirecting you to complete your profile...
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-zinc-400 mt-4" />
      </motion.div>
    );
  }

  if (status === 'rejected') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center text-center space-y-4"
      >
        <div className="w-16 h-16 bg-zinc-100 text-zinc-500 rounded-full flex items-center justify-center mb-4 border border-zinc-200">
          <XCircle className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Verification Cancelled</h1>
        <p className="text-zinc-500 max-w-sm text-sm">
          The unverified account has been securely deleted. If this was a mistake, you can always create a new account.
        </p>
        <Link href="/" className="h-12 mt-8 px-6 bg-white border border-gray-200 text-black font-medium text-sm rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-all pressable">
          Return Home
        </Link>
      </motion.div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className="flex flex-col items-center justify-center text-center space-y-4"
      >
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Verification Failed</h1>
        <p className="text-zinc-500 max-w-sm text-sm">
          {errorMessage}
        </p>
        <Link href="/auth/signup" className="h-12 mt-8 px-6 bg-white border border-gray-200 text-black font-medium text-sm rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-all pressable">
          Try Signing Up Again
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col items-center justify-center text-center"
    >
      <div className="w-16 h-16 bg-zinc-100 text-black rounded-full flex items-center justify-center mb-6 border border-gray-200">
        <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-3 text-zinc-900">Security Check</h1>
      <p className="text-zinc-500 max-w-sm mb-10 text-sm text-balance">
        Are you currently trying to create an account or sign in to InternConnect?
      </p>

      <div className="flex flex-col w-full max-w-sm gap-3">
        <button
          onClick={handleConfirm}
          disabled={status !== 'idle'}
          className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 pressable"
        >
          {status === 'confirming' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {status === 'confirming' ? 'Verifying...' : "Yes, it's me"}
        </button>
        
        <button
          onClick={handleReject}
          disabled={status !== 'idle'}
          className="w-full bg-white text-red-600 border border-gray-200 h-12 rounded-xl font-medium text-sm hover:bg-red-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2 pressable"
        >
          {status === 'rejecting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          {status === 'rejecting' ? 'Rejecting...' : "No, cancel"}
        </button>
      </div>
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50 min-h-[80vh]">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-zinc-400" />}>
        <div className="bg-white p-10 rounded-2xl border border-gray-200 shadow-sm w-full max-w-md flex flex-col items-center justify-center">
          <VerifyContent />
        </div>
      </Suspense>
    </main>
  );
}
