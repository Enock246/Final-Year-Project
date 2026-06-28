'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Loader2, ArrowRight, Building, MapPin, Users, Activity } from 'lucide-react';

interface SchoolApplicationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  school: any; 
}

type Step = 'details' | 'generating' | 'success';

export default function SchoolApplicationDrawer({ isOpen, onClose, school }: SchoolApplicationDrawerProps) {
  const [step, setStep] = useState<Step>('details');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('details');
      setIsGenerating(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; }
  }, [isOpen]);

  const handleApply = () => {
    setIsGenerating(true);
    setStep('generating');
    setTimeout(() => {
      setStep('success');
      setIsGenerating(false);
    }, 2500);
  };

  if (!school) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
          className="fixed inset-0 z-50 bg-[var(--canvas)] overflow-y-auto overflow-x-hidden flex flex-col"
        >
          {/* Close Button (Floating) */}
          <button 
            onClick={onClose} 
            className="fixed top-4 right-4 md:top-6 md:right-8 w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-50 shadow-lg"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Hero Section */}
          <div className="relative w-full h-[40vh] min-h-[300px] md:h-[55vh] bg-[var(--ink)] shrink-0">
            {school.cover_image_url ? (
              <img 
                src={school.cover_image_url} 
                alt={`${school.name} Campus`} 
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[var(--primary-deep)] to-[var(--ink)]" />
            )}
            
            {/* Gradient Overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--canvas)] via-[var(--canvas)]/10 to-transparent" />
          </div>

          {/* Content Area (Overlapping the Hero) */}
          <div className="relative flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full -mt-24 md:-mt-32 pb-24">
            
            {step === 'details' && (
              <div className="animate-in fade-in duration-500">
                {/* Header Profile */}
                <div className="flex flex-col md:flex-row md:items-end gap-6 mb-10">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-[32px] bg-white shadow-2xl border-4 border-white flex items-center justify-center shrink-0 overflow-hidden relative z-10">
                    {school.logo_url ? (
                      <img src={school.logo_url} alt={`${school.name} Badge`} className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-12 h-12 text-[var(--ink-mute)]" />
                    )}
                  </div>
                  <div className="relative z-10 pb-2">
                    <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-[var(--primary)] px-3 py-1 rounded-md micro-cap border border-[var(--hairline)] mb-3 shadow-sm">
                      <SparklesIcon /> {school.matchScore}% Match
                    </div>
                    <h1 className="display-lg text-[var(--ink)] mb-2 md:text-5xl">{school.name}</h1>
                    <div className="flex items-center gap-2 text-[var(--ink-mute)] body-lg">
                      <MapPin className="w-5 h-5" />
                      <span>{school.location.town}, {school.location.region}</span>
                      {school.distance_km && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{school.distance_km.toFixed(1)} km away</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Left Column: History & Details */}
                  <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-[var(--hairline)]">
                      <h2 className="heading-md text-[var(--ink)] mb-4">About the School</h2>
                      <p className="body-lg text-[var(--ink-secondary)] leading-relaxed whitespace-pre-line">
                        {school.history || `${school.name} is a prominent educational institution dedicated to academic excellence and student development. It provides rigorous curriculum and holistic training for future leaders.`}
                      </p>
                    </div>

                    <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-[var(--hairline)]">
                      <h2 className="heading-md text-[var(--ink)] mb-6">Quick Facts</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[var(--primary-subdued)]/30 flex items-center justify-center text-[var(--primary)]">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="caption text-[var(--ink-mute)]">Past Interns</div>
                            <div className="heading-sm text-[var(--ink)]">{school.stats?.pastInterns || 12}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)]">
                            <Activity className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="caption text-[var(--ink-mute)]">Offer Rate</div>
                            <div className="heading-sm text-[var(--ink)]">{school.stats?.offerRate || 85}%</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Action Card */}
                  <div className="md:col-span-1">
                    <div className="bg-white rounded-[24px] p-6 shadow-xl border border-[var(--hairline)] sticky top-8">
                      <h3 className="heading-sm text-[var(--ink)] mb-2">Ready to apply?</h3>
                      <p className="caption text-[var(--ink-secondary)] mb-6">
                        Your profile details will be securely sent to the school's coordinator for review.
                      </p>
                      <button
                        onClick={handleApply}
                        className="w-full bg-[var(--primary)] text-white font-medium py-3.5 rounded-pill hover:bg-[var(--primary-deep)] hover:scale-[1.02] transition-all shadow-[0_8px_20px_rgba(13,138,188,0.3)] flex items-center justify-center gap-2 group"
                      >
                        Submit Application <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'generating' && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-6">
                  <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
                </div>
                <h3 className="display-sm text-[var(--ink)] mb-2">Processing...</h3>
                <p className="body-lg text-[var(--ink-mute)]">Transmitting profile to {school.name}</p>
              </div>
            )}

            {step === 'success' && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 rounded-full bg-[var(--success)]/10 flex items-center justify-center mb-6 border-4 border-white shadow-xl">
                  <CheckCircle2 className="w-12 h-12 text-[var(--success)]" />
                </div>
                <h2 className="display-sm text-[var(--ink)] mb-3">Application Sent!</h2>
                <p className="body-lg text-[var(--ink-secondary)] mb-8 max-w-md mx-auto">
                  Your details have been securely transmitted to {school.name}. You will be notified when they respond.
                </p>
                <button 
                  onClick={onClose}
                  className="bg-white text-[var(--ink)] font-medium px-8 py-3.5 rounded-pill border border-[var(--hairline)] hover:bg-[var(--canvas-soft)] transition-colors shadow-sm"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SparklesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    </svg>
  );
}
