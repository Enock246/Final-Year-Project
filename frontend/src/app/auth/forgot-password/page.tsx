'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from '../actions';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');

    const formData = new FormData();
    formData.append('email', data.email);

    const result = await sendPasswordResetEmail(formData);

    if (result?.error) {
      setErrorMessage(result.error);
      setIsSubmitting(false);
    } else if (result?.success) {
      router.push(`/auth/reset-password?email=${encodeURIComponent(data.email)}`);
    }
  };

  const getInputClassName = (hasError: boolean) => {
    const base = "w-full min-h-[48px] px-4 rounded-2xl border bg-canvas text-[16px] md:text-[15px] text-ink focus:outline-none transition-all duration-200";
    if (hasError) {
      return `${base} border-ruby focus:border-ruby focus:ring-[3px] focus:ring-ruby/10`;
    }
    return `${base} border-black/10 focus:border-primary-press focus:ring-[3px] focus:ring-primary-press/10`;
  };

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 bg-canvas-soft min-h-screen items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas px-5 pb-5 pt-10 md:p-8 md:pt-12 rounded-xl shadow-none border border-hairline flex flex-col overflow-hidden relative"
        >
          <Link href="/auth/signin" className="absolute top-4 left-5 md:top-6 md:left-8 text-[13px] font-medium text-ink-mute hover:text-ink transition-colors flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Link>
          
          <div className="w-12 h-12 bg-primary-subdued text-primary-deep rounded-full flex items-center justify-center mb-6">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          
          <h1 className="heading-lg text-ink mb-2">Forgot password?</h1>
          <p className="body-md text-ink-mute mb-8">
            Enter the email address associated with your account and we'll send you a 6-digit code to reset your password.
          </p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-50 border border-red-200 text-ruby rounded-md text-[13px] font-medium flex items-start gap-2"
            >
              <div className="w-1.5 h-1.5 bg-ruby rounded-full mt-1.5 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-5">
            <div>
              <label className="text-[13px] font-medium text-ink-secondary mb-1.5 block">Email</label>
              <div className="relative">
                <input
                  {...register('email')}
                  type="email"
                  placeholder="kwame.mensah@stu.aamusted.edu.gh"
                  className={getInputClassName(!!errors.email)}
                />
                {errors.email && (
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <AlertCircle className="w-4 h-4 text-ruby" />
                  </div>
                )}
              </div>
              {errors.email && <p className="text-ruby text-[13px] mt-1.5">{errors.email.message}</p>}
            </div>

            <div className="mt-auto pt-6 z-10">
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isSubmitting ? 'Sending code...' : 'Send reset code'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
