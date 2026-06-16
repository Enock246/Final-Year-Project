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
    <main className="min-h-screen flex flex-col relative bg-canvas stripe-gradient-mesh">
      {/* Navigation on Mesh */}
      <nav className="w-full px-6 py-6 lg:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-ink flex items-center justify-center text-white">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="font-semibold text-[18px] text-ink tracking-tight">InternConnect</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/auth/signin" className="text-ink font-medium text-[15px] hover:text-primary transition-colors">
            Sign in
          </Link>
          <Link href="/auth/signup" className="bg-primary text-white button-sm rounded-pill px-4 py-2 hover:bg-primary-press transition-colors shadow-sm">
            Start now
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 z-10 mt-[-40px]">
        
        <div className="text-center mb-12 max-w-2xl">
          <motion.h1 
            key={`title-${currentSlide}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="display-xl text-ink mb-6"
          >
            {slides[currentSlide].title}
          </motion.h1>
          <motion.p 
            key={`desc-${currentSlide}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="body-lg text-ink-secondary"
          >
            {slides[currentSlide].description}
          </motion.p>
        </div>

        {/* Floating Card */}
        <div 
          className="w-full max-w-md bg-canvas rounded-xl shadow-[rgba(0,55,112,0.08)_0_8px_24px,rgba(0,55,112,0.04)_0_2px_6px] p-10 flex flex-col items-center relative overflow-hidden"
          style={{ border: '1px solid var(--hairline)' }}
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
              <div className="w-24 h-24 rounded-full bg-canvas-soft flex items-center justify-center mb-6 border border-hairline text-primary">
                <Icon className="w-10 h-10 stroke-[1.5]" />
              </div>
            </motion.div>
          </AnimatePresence>
          
          <div className="flex justify-center gap-2 mb-10 w-full mt-4">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-hairline'
                }`}
              />
            ))}
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-primary text-white button-md h-[48px] rounded-pill hover:bg-primary-press transition-colors flex items-center justify-center gap-2 btn-primary"
          >
            {currentSlide === slides.length - 1 ? 'Create your account' : 'Next'}
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
        
      </div>
    </main>
  );
}
