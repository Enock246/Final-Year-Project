'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Activity, MapPin, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const slides = [
  {
    id: 1,
    title: 'Discover Schools',
    description: 'Find the best SHS placements based on your location and preferences.',
    icon: Search,
  },
  {
    id: 2,
    title: 'AI-Powered Letters',
    description: 'Professional application letters generated and sent automatically.',
    icon: Sparkles,
  },
  {
    id: 3,
    title: 'Track Everything',
    description: 'Real-time updates when schools open your application.',
    icon: Activity,
  },
];

export default function OnboardingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      router.push('/auth/signup');
    }
  };

  const Icon = slides[currentSlide].icon;

  return (
    <main className="min-h-screen flex flex-col relative bg-[var(--canvas)] overflow-hidden">
      
      {/* Navigation */}
      <nav className="w-full px-4 md:px-6 py-4 md:py-6 lg:px-12 flex justify-between items-center z-20">
        <div className="flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[var(--hairline)]">
          <div className="w-6 h-6 rounded-full bg-[var(--ink)] flex items-center justify-center text-white shrink-0">
            <MapPin className="w-3 h-3" />
          </div>
          <span className="font-semibold text-[15px] text-[var(--ink)] tracking-tight pr-2">InternAid</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6 bg-white/80 backdrop-blur-md px-2 py-2 rounded-full border border-[var(--hairline)]">
          <Link href="/auth/signin" className="hidden md:block text-[var(--ink)] font-medium text-[14px] hover:text-[var(--primary)] transition-colors px-3">
            Sign in
          </Link>
          <Link href="/auth/signup" className="bg-[var(--primary)] text-white px-5 py-2 rounded-full text-[14px] font-medium hover:bg-[var(--primary-deep)] transition-colors">
            Start now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 mt-[-20px] md:mt-[-40px]">
        
        <div className="text-center mb-10 max-w-2xl relative z-10">
          <motion.h1 
            key={`title-${currentSlide}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-[var(--ink)] mb-4 tracking-tight"
            style={{ letterSpacing: '-0.04em' }}
          >
            {slides[currentSlide].title}
          </motion.h1>
          <motion.p 
            key={`desc-${currentSlide}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[17px] text-[var(--ink-secondary)]"
          >
            {slides[currentSlide].description}
          </motion.p>
        </div>

        {/* Floating Card */}
        <div 
          className="w-full max-w-md bg-[var(--canvas-soft)] rounded-[24px] p-10 flex flex-col items-center relative overflow-hidden border border-[var(--hairline)]"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-[var(--canvas-soft-2)] flex items-center justify-center mb-6 border border-[var(--hairline)] text-[var(--primary)]">
                <Icon className="w-10 h-10 stroke-[1.5]" />
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center gap-2 mb-10 w-full mt-4">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-[var(--ink)]' : 'w-2 bg-[var(--hairline)]'
                }`}
              />
            ))}
          </div>
          <div className="w-full mt-10">
            <button 
              onClick={handleNext}
              className="pressable w-full py-3.5 bg-[var(--primary)] text-white rounded-full font-semibold flex items-center justify-center gap-2 transition-colors hover:bg-[var(--primary-deep)] text-[17px]"
            >
              {currentSlide === slides.length - 1 ? 'Create your account' : 'Next'}
              <ChevronRight className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
        
      </div>
    </main>
  );
}
