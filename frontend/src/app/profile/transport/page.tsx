'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Car, Bus, Users, Footprints, Clock, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TRANSPORT_MODES = [
  { id: 'OWN', label: 'Car', description: 'Personal vehicle or motorbike', icon: Car },
  { id: 'PUBLIC', label: 'Public', description: 'Trotro or public bus', icon: Bus },
  { id: 'ARRANGE', label: 'Arrange', description: 'Carpool with friends/family', icon: Users },
  { id: 'WALKING', label: 'Walk', description: 'Within walking distance', icon: Footprints },
];

export default function TransportSetupPage() {
  const router = useRouter();
  const [transportMode, setTransportMode] = useState<string>('');
  const [maxCommute, setMaxCommute] = useState<number>(60);
  const [isSaving, setIsSaving] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function loadData() {
      const saved = localStorage.getItem('profileSetupDraft');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.transportMode) setTransportMode(data.transportMode);
          if (data.maxCommute) setMaxCommute(data.maxCommute);
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }

      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('student_profiles')
            .select('transport_preference, max_commute_minutes')
            .eq('student_id', user.id)
            .single();

          if (data) {
            if (data.transport_preference) setTransportMode(data.transport_preference);
            if (data.max_commute_minutes) setMaxCommute(data.max_commute_minutes);
          }
        }
      } catch (err) {
        console.error('Error fetching DB profile', err);
      }
    }
    loadData();
  }, []);

  const handleNext = async () => {
    setIsSaving(true);
    
    const draft = JSON.parse(localStorage.getItem('profileSetupDraft') || '{}');
    localStorage.setItem('profileSetupDraft', JSON.stringify({
      ...draft,
      transportMode,
      maxCommute
    }));

    const { updateProfile } = await import('../actions');
    const result = await updateProfile({
      transport_preference: transportMode,
      max_commute_minutes: maxCommute
    });
    
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      router.push('/profile/documents');
    }
  };

  const handleBack = () => {
    router.push('/profile/location');
  };

  // Slider Logic
  const handleSliderUpdate = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    
    // Values: 1 to 120 minutes
    const min = 1;
    const max = 120;
    let newValue = Math.round(min + percentage * (max - min));
    
    // Smooth 1-minute intervals
    setMaxCommute(Math.max(1, Math.min(120, newValue)));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleSliderUpdate(e.clientX);
    };
    const handleMouseUp = () => setIsDragging(false);
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleSliderUpdate(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const isValid = transportMode !== '';
  
  const formatTime = (mins: number) => {
    if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`;
    if (mins === 60) return `1 hour`;
    if (mins === 120) return `2+ hours`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} hrs` : `${h}h ${m}m`;
  };

  const sliderPercentage = ((maxCommute - 1) / (120 - 1)) * 100;

  // Stripe Classes
  const cardClassName = "w-full max-w-md bg-canvas p-8 rounded-lg shadow-[rgba(0,55,112,0.08)_0_1px_3px] border border-hairline";
  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-3 flex items-center gap-2";

  return (
    <main className="flex-1 flex flex-col p-6 bg-canvas-soft min-h-screen">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className={cardClassName}
        >
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-[13px] font-medium text-ink-mute hover:text-ink mb-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          
          <div className="mb-2">
            <h1 className="heading-lg text-ink mb-1">Transportation</h1>
          </div>
          <p className="body-md text-ink-mute mb-8 text-balance">
            Tell us how you plan to travel so we can match you with accessible schools.
          </p>

          <div className="space-y-10">
            {/* Transport Mode Segmented Control */}
            <div>
              <label className={labelClassName}>
                <Car className="w-4 h-4" />
                How will you commute?
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {TRANSPORT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = transportMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setTransportMode(mode.id)}
                      className={`relative flex flex-col items-start p-4 rounded-md border text-left transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary-subdued/30' 
                          : 'border-input bg-canvas hover:border-ink-mute/30'
                      }`}
                    >
                      <div className={`mb-3 p-1.5 rounded-sm ${isSelected ? 'bg-primary text-white shadow-sm' : 'bg-canvas-soft text-ink-mute'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={`text-[14px] font-semibold mb-0.5 ${isSelected ? 'text-primary-deep' : 'text-ink'}`}>
                        {mode.label}
                      </span>
                      <span className={`text-[11px] leading-tight ${isSelected ? 'text-primary-deep/80' : 'text-ink-mute'}`}>
                        {mode.description}
                      </span>
                      
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commute Time Slider */}
            <div>
              <label className={labelClassName}>
                <Clock className="w-4 h-4" />
                Maximum daily travel time
              </label>
              
              <div className="mt-8 px-2">
                <div 
                  ref={sliderRef}
                  className="relative h-1.5 bg-input rounded-full cursor-pointer"
                  onMouseDown={(e) => {
                    setIsDragging(true);
                    handleSliderUpdate(e.clientX);
                  }}
                  onTouchStart={(e) => {
                    setIsDragging(true);
                    handleSliderUpdate(e.touches[0].clientX);
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-primary rounded-full"
                    style={{ width: `${sliderPercentage}%` }}
                  />
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white border-[2px] border-primary rounded-full shadow-sm cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center justify-center"
                    style={{ left: `${sliderPercentage}%` }}
                  >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-50" />
                  </div>
                  
                  {/* Floating tooltip */}
                  <div 
                    className="absolute -top-10 -translate-x-1/2 bg-ink text-white text-[12px] font-semibold py-1 px-2.5 rounded-sm whitespace-nowrap shadow-sm pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[4px] after:border-transparent after:border-t-ink"
                    style={{ left: `${sliderPercentage}%` }}
                  >
                    {formatTime(maxCommute)}
                  </div>
                </div>
                
                <div className="flex justify-between mt-3 text-[11px] font-medium text-ink-mute">
                  <span>1 min</span>
                  <span>2+ hours</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] text-ruby min-h-[20px] transition-opacity">
                {!isValid ? "Please select a transport mode to continue." : ""}
              </span>
            </div>
            <button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full bg-primary text-white button-md py-2.5 px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 btn-primary shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
