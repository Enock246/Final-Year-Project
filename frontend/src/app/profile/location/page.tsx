'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import regionsData from '@/data/regions.json';
import { useRouter } from 'next/navigation';

export default function LocationSetupPage() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [townCity, setTownCity] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState<{ region: string; town: string } | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  const activeDistricts = regionsData.find((r) => r.name === selectedRegion)?.districts || [];

  const handleDetectLocation = () => {
    setIsDetecting(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lon: longitude });
            
            const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            
            if (res.ok && data) {
              const { region: cleanRegion, town: detectedTown } = data;
              
              const matchedRegion = regionsData.find((r) => 
                r.name.toLowerCase().includes(cleanRegion.toLowerCase()) || 
                cleanRegion.toLowerCase().includes(r.name.toLowerCase())
              );
              
              if (matchedRegion) {
                setSelectedRegion(matchedRegion.name);
                setSelectedDistrict('');
              }
              
              if (detectedTown) {
                setTownCity(detectedTown);
              }
              
              setLocationDetected({ 
                region: matchedRegion ? matchedRegion.name : cleanRegion || 'Unknown', 
                town: detectedTown || 'Unknown' 
              });
            } else {
              alert(data.error || 'Could not determine address from location data.');
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
            alert('Failed to process location data. Please select manually.');
          } finally {
            setIsDetecting(false);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsDetecting(false);
          alert('Location access denied or unavailable. Please select manually.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsDetecting(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      // 1. Load from localStorage first for immediate UI feel
      const saved = localStorage.getItem('profileSetupDraft');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.region) setSelectedRegion(data.region);
          if (data.district) setSelectedDistrict(data.district);
          if (data.townCity) setTownCity(data.townCity);
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }

      // 2. Fetch from DB (overrides draft if the user previously saved it securely)
      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('student_profiles')
            .select('region_id, district_id, town_city')
            .eq('student_id', user.id)
            .single();

          if (data) {
            // Note: DB doesn't currently store the raw name for region_id/district_id if they are UUIDs. 
            // In our current setup, we actually don't store region name in DB yet since it expects IDs.
            // But we do store town_city. Let's at least populate town_city.
            if (data.town_city) setTownCity(data.town_city);
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
      region: selectedRegion,
      district: selectedDistrict,
      townCity: townCity
    }));

    const { updateProfile } = await import('../actions');
    const result = await updateProfile({
      town_city: townCity,
      region_name: selectedRegion,
      district_name: selectedDistrict,
      latitude: coords?.lat,
      longitude: coords?.lon
    });
    
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      router.push('/profile/transport');
    }
  };

  const isValid = selectedRegion && selectedDistrict && townCity.length > 2;

  // Stripe Classes
  const inputClassName = "text-input w-full min-h-[48px]";
  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <main className="flex-1 flex flex-col p-0 md:p-6 bg-canvas md:bg-canvas-soft min-h-screen">
      <div className="w-full max-w-md mx-auto md:mt-8 flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas p-6 md:p-8 md:rounded-lg md:shadow-level-1 md:border md:border-hairline flex-1 flex flex-col"
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="heading-lg text-ink mb-1">Where do you live?</h1>
            </div>
            
            <button 
              onClick={async () => {
                const supabase = (await import('@/utils/supabase/client')).createClient();
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="caption text-ink-mute hover:text-ink transition-colors"
            >
              Sign Out
            </button>
          </div>
          <p className="body-md text-ink-mute mb-8 text-balance">
            We'll use this to find nearby schools and calculate the best transportation routes.
          </p>

          <div className="space-y-5">
            <div>
              <label className={labelClassName}>Region</label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedDistrict('');
                  }}
                  className={`${inputClassName} appearance-none pr-10 ${!selectedRegion && 'text-ink-mute'}`}
                >
                  <option value="" disabled>Select Region</option>
                  {regionsData.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClassName}>District</label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedRegion}
                  className={`${inputClassName} appearance-none pr-10 disabled:opacity-50 disabled:bg-canvas-soft ${!selectedDistrict && 'text-ink-mute'}`}
                >
                  <option value="" disabled>Select District</option>
                  {activeDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className={labelClassName}>Town or City</label>
              <input
                type="text"
                value={townCity}
                onChange={(e) => setTownCity(e.target.value)}
                placeholder="e.g. Sunyani"
                className={inputClassName}
              />
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleDetectLocation}
                disabled={isDetecting || !!locationDetected}
                className={`w-full min-h-[48px] md:h-10 rounded-sm font-medium text-[16px] md:text-[13px] transition-all flex items-center justify-center gap-2 ${
                  locationDetected 
                    ? 'bg-primary-subdued text-primary-deep cursor-default border border-transparent'
                    : isDetecting 
                      ? 'bg-canvas-soft text-ink-mute border border-hairline-input cursor-wait' 
                      : 'bg-white hover:bg-canvas-soft text-ink border border-hairline-input shadow-sm'
                }`}
              >
                {locationDetected ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Location Detected
                  </>
                ) : isDetecting ? (
                  <>
                    <MapPin className="w-4 h-4 animate-bounce" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 text-primary" />
                    Auto-detect my location
                  </>
                )}
              </button>
            </div>

            <AnimatePresence>
              {locationDetected && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 p-3 bg-primary-subdued/30 border border-primary-subdued rounded-sm mt-1">
                    <div className="mt-0.5">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="caption text-primary-deep leading-tight mb-0.5">We found you!</p>
                      <p className="micro text-primary-deep/80 leading-tight">
                        Mapped to {locationDetected.town}, {locationDetected.region}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-auto pt-8 md:pt-6 sticky bottom-0 left-0 right-0 bg-canvas md:relative p-4 md:p-0 border-t border-hairline md:border-t-0 z-10 -mx-6 md:mx-0">
            <div className="flex items-center justify-between mb-3 md:mb-0 md:absolute md:-top-7 md:w-full">
              <span className="caption text-ruby min-h-[20px] transition-opacity">
                {!isValid ? "Please complete all required fields." : ""}
              </span>
            </div>
            <button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full button-primary-pill min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
