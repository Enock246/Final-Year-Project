'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronRight, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const signupSchema = z.object({
  fullName: z.string().min(3, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  studentId: z.string().min(5, 'Student ID is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain a special character'),
  terms: z.literal(true, {
    message: 'You must agree to the Terms & Privacy Policy'
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification States
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  });

  const supabase = createClient();

  const loadingSteps = [
    'Creating your account...',
    'Setting up your secure profile...',
    'Sending verification email...',
  ];

  const onSubmit = async (data: SignupFormValues) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setLoadingStep(0);
    setEmailForOtp(data.email);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone_number: data.phone,
          student_id: data.studentId
        },
      }
    });

    if (authError) {
      setIsSubmitting(false);
      if (authError.message.includes('already registered')) {
        setErrorMessage('This email is already registered. Please sign in instead.');
      } else {
        setErrorMessage(authError.message);
      }
      return;
    }

    if (authData?.user && authData.user.identities && authData.user.identities.length === 0) {
      setIsSubmitting(false);
      setErrorMessage('This email is already registered. Please sign in instead.');
      return;
    }

    await new Promise(r => setTimeout(r, 800));
    setLoadingStep(1);
    await new Promise(r => setTimeout(r, 800));
    setLoadingStep(2);
    await new Promise(r => setTimeout(r, 800));
    
    setIsSubmitting(false);
    setErrorMessage('');
    setVerificationSent(true);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter a valid 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage('');

    const { data, error } = await supabase.auth.verifyOtp({
      email: emailForOtp,
      token: otpCode,
      type: 'signup'
    });

    if (error) {
      setIsVerifyingOtp(false);
      setErrorMessage(error.message);
      return;
    }

    // Success! Redirect to profile setup
    router.push('/profile/location');
  };

  if (verificationSent) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50">
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full max-w-sm flex flex-col items-center text-center space-y-4 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm"
        >
          <div className="w-16 h-16 bg-zinc-50 text-black rounded-full flex items-center justify-center mb-2 border border-gray-100">
            <ShieldCheck className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight">Enter verification code</h2>
          <p className="text-zinc-500 text-sm text-balance leading-relaxed mb-4">
            We've sent a 6-digit code to <span className="font-medium text-zinc-900">{emailForOtp}</span>. Please enter it below.
          </p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-medium mb-4"
            >
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleVerifyOtp} className="w-full space-y-4">
            <div className="space-y-1.5 w-full">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setOtpCode(val);
                }}
                placeholder="000000"
                className="w-full h-14 px-4 text-center tracking-[1em] text-2xl font-medium rounded-xl border border-gray-200 bg-white text-zinc-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={otpCode.length !== 6 || isVerifyingOtp}
              className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 pressable mt-2"
            >
              {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
          
          <button 
            onClick={() => {
              setVerificationSent(false);
              setOtpCode('');
            }}
            className="text-xs text-zinc-500 hover:text-black mt-2 font-medium transition-colors"
          >
            Wrong email? Go back
          </button>
        </motion.div>
      </main>
    );
  }

  if (isSubmitting) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-50">
        <div className="w-full max-w-sm space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
          {loadingSteps.map((step, index) => (
            <AnimatePresence key={index}>
              {loadingStep >= index && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
                  className="flex items-center gap-4 text-sm font-medium text-zinc-900"
                >
                  {loadingStep > index ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-black"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                    </motion.div>
                  ) : (
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                  )}
                  <span className={loadingStep > index ? 'text-zinc-900' : 'text-zinc-500'}>
                    {step}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-6 bg-zinc-50">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <h1 className="text-2xl font-semibold tracking-tight mb-2 text-zinc-900">Create account</h1>
          <p className="text-zinc-500 text-sm mb-8">Join InternConnect to find your placement.</p>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              {errorMessage}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Full Name</label>
              <input
                {...register('fullName')}
                placeholder="Kwame Mensah"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1 font-medium">{errors.fullName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="kwame.mensah@stu.aamusted.edu.gh"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="0244123456"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Student ID</label>
              <input
                {...register('studentId')}
                placeholder="IT/ED/2023/001"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
              {errors.studentId && <p className="text-red-500 text-xs mt-1 font-medium">{errors.studentId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-12 px-4 pr-10 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
            </div>

            <div className="pt-2 pb-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    {...register('terms')} 
                    type="checkbox" 
                    className="peer w-5 h-5 appearance-none rounded border border-gray-300 bg-white checked:bg-black checked:border-black transition-all cursor-pointer" 
                  />
                  <CheckCircle2 className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity stroke-[3]" />
                </div>
                <span className="text-sm font-normal text-zinc-500 transition-colors leading-relaxed">
                  I agree to the <Link href="/terms" className="text-black hover:underline font-medium">Terms of Service</Link> and <Link href="/privacy" className="text-black hover:underline font-medium">Privacy Policy</Link>
                </span>
              </label>
              {errors.terms && <p className="text-red-500 text-xs mt-1 font-medium">{errors.terms.message}</p>}
            </div>

            <button
              type="submit"
              disabled={!isValid}
              className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 pressable mt-2"
            >
              Create Account
              <ChevronRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-center mt-8 text-sm text-zinc-500">
            Already have an account?{' '}
            <Link href="/auth/signin" className="font-medium text-black hover:underline">
              Sign In
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
