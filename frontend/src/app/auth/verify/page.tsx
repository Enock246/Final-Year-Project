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
        <div className="w-16 h-16 bg-primary-subdued text-primary-deep rounded-full flex items-center justify-center mb-4">
          <UserCheck className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="heading-lg text-ink">Verified!</h1>
        <p className="text-ink-mute max-w-sm body-md">
          Your email has been confirmed. Redirecting you to complete your profile...
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-ink-mute mt-4" />
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
        <div className="w-16 h-16 bg-canvas-soft text-ink-mute rounded-full flex items-center justify-center mb-4 border border-hairline">
          <XCircle className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="heading-lg text-ink">Verification Cancelled</h1>
        <p className="text-ink-mute max-w-sm body-md">
          The unverified account has been securely deleted. If this was a mistake, you can always create a new account.
        </p>
        <Link href="/" className="h-12 mt-8 px-6 bg-canvas border border-input text-ink font-medium text-[15px] rounded-sm flex items-center justify-center hover:border-primary transition-all">
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
        <div className="w-16 h-16 bg-red-50 text-ruby rounded-full flex items-center justify-center mb-4 border border-red-100">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="heading-lg text-ink">Verification Failed</h1>
        <p className="text-ink-mute max-w-sm body-md">
          {errorMessage}
        </p>
        <Link href="/auth/signup" className="h-12 mt-8 px-6 bg-canvas border border-input text-ink font-medium text-[15px] rounded-sm flex items-center justify-center hover:border-primary transition-all">
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
      <div className="w-16 h-16 bg-primary-subdued text-primary-deep rounded-full flex items-center justify-center mb-6">
        <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h1 className="heading-lg text-ink mb-2">Security Check</h1>
      <p className="text-ink-mute max-w-sm mb-10 body-md">
        Are you currently trying to create an account or sign in to InternConnect?
      </p>

      <div className="flex flex-col w-full max-w-sm gap-3">
        <button
          onClick={handleConfirm}
          disabled={status !== 'idle'}
          className="w-full bg-primary text-white h-[48px] rounded-pill button-md hover:bg-primary-press disabled:opacity-50 transition-colors flex items-center justify-center gap-2 btn-primary shadow-sm"
        >
          {status === 'confirming' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {status === 'confirming' ? 'Verifying...' : "Yes, it's me"}
        </button>
        
        <button
          onClick={handleReject}
          disabled={status !== 'idle'}
          className="w-full bg-canvas text-ruby border border-input h-[48px] rounded-pill button-md hover:border-ruby disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
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
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-canvas-soft min-h-[80vh]">
      <Suspense fallback={<Loader2 className="w-6 h-6 animate-spin text-ink-mute" />}>
        <div className="bg-canvas p-10 rounded-lg border border-hairline shadow-[rgba(0,55,112,0.08)_0_1px_3px] w-full max-w-md flex flex-col items-center justify-center">
          <VerifyContent />
        </div>
      </Suspense>
    </main>
  );
}
