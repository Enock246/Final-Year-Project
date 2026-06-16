'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, Bus, Users, Footprints, Clock, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const TRANSPORT_MODES = [
  { id: 'OWN', label: 'I have my own transport (car/motorbike)', icon: Car },
  { id: 'PUBLIC', label: "I'll use public transport (trotro/bus)", icon: Bus },
  { id: 'ARRANGE', label: 'I can arrange transport with family/friends', icon: Users },
  { id: 'WALKING', label: 'I prefer schools within walking distance', icon: Footprints },
];

const COMMUTE_TIMES = [
  { id: 30, label: '30 minutes' },
  { id: 60, label: '1 hour' },
  { id: 90, label: '1.5 hours' },
  { id: 120, label: '2+ hours (willing to relocate)' },
];

export default function TransportSetupPage() {
  const router = useRouter();
  const [transportMode, setTransportMode] = useState<string>('');
  const [maxCommute, setMaxCommute] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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

  const isValid = transportMode && maxCommute;

  return (
    <main className="flex-1 flex flex-col p-6 bg-zinc-50">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <button 
            onClick={handleBack}
            className="flex items-center gap-1 text-sm font-medium text-zinc-500 hover:text-black mb-6 transition-colors pressable"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="mb-2">
            <span className="text-xs font-semibold text-zinc-500 mb-2 block tracking-wider uppercase">Step 2 of 3</span>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Transportation</h1>
          </div>
          <p className="text-zinc-500 mb-8 text-sm text-balance">
            Tell us how you plan to travel so we match you with accessible schools.
          </p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Car className="w-4 h-4 text-zinc-500" />
                How will you travel to your internship?
              </label>
              
              <div className="space-y-2">
                {TRANSPORT_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = transportMode === mode.id;
                  return (
                    <label 
                      key={mode.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-black bg-zinc-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full border ${isSelected ? 'border-black' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                      </div>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-black' : 'text-zinc-400'}`} />
                      <span className={`text-sm font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
                        {mode.label}
                      </span>
                      <input 
                        type="radio" 
                        name="transportMode" 
                        value={mode.id}
                        checked={isSelected}
                        onChange={() => setTransportMode(mode.id)}
                        className="hidden"
                      />
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                Maximum daily travel you're comfortable with?
              </label>
              
              <div className="space-y-2">
                {COMMUTE_TIMES.map((time) => {
                  const isSelected = maxCommute === time.id;
                  return (
                    <label 
                      key={time.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-black bg-zinc-50' 
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-5 h-5 rounded-full border ${isSelected ? 'border-black' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-zinc-900' : 'text-zinc-600'}`}>
                        {time.label}
                      </span>
                      <input 
                        type="radio" 
                        name="maxCommute" 
                        value={time.id}
                        checked={isSelected}
                        onChange={() => setMaxCommute(time.id)}
                        className="hidden"
                      />
                    </label>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 pressable"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Next
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
