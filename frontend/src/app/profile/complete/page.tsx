'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function ProfileCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Fire confetti after a brief delay
    const timeout = setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#533afd', '#ffffff', '#000000', '#facc15']
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  const handleDashboard = () => {
    router.push('/dashboard');
  };

  const cardClassName = "w-full max-w-md bg-canvas p-10 rounded-lg shadow-[rgba(0,55,112,0.08)_0_1px_3px] border border-hairline flex flex-col items-center text-center";

  return (
    <main className="flex-1 flex flex-col p-6 bg-canvas-soft min-h-screen">
      <div className="w-full max-w-md mx-auto mt-16 flex-1">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className={cardClassName}
        >
          {/* Animated Success Circle */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-6 relative shadow-lg shadow-primary/20"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <Check className="w-10 h-10 text-white stroke-[3]" />
            </motion.div>
            
            {/* Sparkles around the checkmark */}
            <motion.div
              initial={{ opacity: 0, rotate: -45, scale: 0 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="absolute -top-2 -right-2 text-yellow-400"
            >
              <Sparkles className="w-6 h-6 fill-current" />
            </motion.div>
          </motion.div>

          <h1 className="heading-lg text-ink mb-3">You're All Set!</h1>
          <p className="body-md text-ink-mute mb-10 max-w-[280px]">
            Your profile has been fully completed and verified. You're ready to find your perfect placement.
          </p>

          <button
            onClick={handleDashboard}
            className="w-full bg-primary text-white button-md py-3 px-4 rounded-pill hover:bg-primary-press transition-all flex items-center justify-center gap-2 btn-primary shadow-sm group"
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </main>
  );
}
