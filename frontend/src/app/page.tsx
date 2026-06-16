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
    highlight: '200+ schools in database',
    icon: Search,
  },
  {
    id: 2,
    title: 'AI-Powered Letters',
    description: 'Professional application letters generated and sent automatically.',
    highlight: 'Written by AI, approved by you',
    icon: Sparkles,
  },
  {
    id: 3,
    title: 'Track Everything',
    description: 'Real-time updates when schools open your application.',
    highlight: 'Know exactly where you stand',
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
    <main className="flex-1 flex flex-col items-center justify-between p-6 overflow-hidden">
      <div className="w-full max-w-md flex-1 flex flex-col mt-12 relative">
        <div className="flex justify-between items-center mb-8 px-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="font-semibold text-lg text-zinc-900 tracking-tight">InternConnect</span>
          </div>
          <Link href="/auth/signin" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors pressable">
            Sign In
          </Link>
        </div>

        <div className="relative flex-1 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col items-center justify-center p-8 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8"
            >
              <div className="w-20 h-20 rounded-2xl bg-zinc-50 flex items-center justify-center mb-8 text-black border border-gray-100">
                <Icon className="w-10 h-10 stroke-[1.5]" />
              </div>
              
              <h2 className="text-2xl font-semibold tracking-tight mb-3 text-zinc-900">
                {currentSlide === 0 ? "Discover Schools" : currentSlide === 1 ? "AI-Powered Letters" : "Track Everything"}
              </h2>
              <p className="text-zinc-500 text-balance font-normal mb-8">
                {currentSlide === 0 ? "Find the best SHS placements based on your location and preferences." : currentSlide === 1 ? "Professional application letters generated and sent automatically." : "Real-time updates when schools open your application."}
              </p>
            </motion.div>
          </AnimatePresence>
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentSlide ? 'w-6 bg-black' : 'w-1.5 bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button 
            onClick={handleNext}
            className="w-full bg-black text-white h-14 rounded-xl font-medium text-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 pressable"
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            <ChevronRight className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>
    </main>
  );
}
