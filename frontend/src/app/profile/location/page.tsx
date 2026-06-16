'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, ChevronRight, Loader2 } from 'lucide-react';
import regionsData from '@/data/regions.json';
import { useRouter } from 'next/navigation';

export default function LocationSetupPage() {
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [townCity, setTownCity] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationDetected, setLocationDetected] = useState<{ region: string; town: string } | null>(null);

  const activeDistricts = regionsData.find((r) => r.name === selectedRegion)?.districts || [];

  const handleDetectLocation = () => {
    setIsDetecting(true);
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
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
      town_city: townCity
    });
    
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      router.push('/profile/transport');
    }
  };

  const isValid = selectedRegion && selectedDistrict && townCity.length > 2;

  return (
    <main className="flex-1 flex flex-col p-6 bg-zinc-50">
      <div className="w-full max-w-md mx-auto mt-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Where do you live?</h1>
            </div>
            
            <button 
              onClick={async () => {
                const supabase = (await import('@/utils/supabase/client')).createClient();
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="text-xs font-medium text-zinc-500 hover:text-black transition-colors pressable"
            >
              Sign Out
            </button>
          </div>
          <p className="text-zinc-500 text-sm mb-8 text-balance">
            We'll use this to find nearby schools and calculate the best transportation routes.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Region</label>
              <div className="relative">
                <select
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedDistrict('');
                  }}
                  className="w-full h-12 px-4 appearance-none rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                >
                  <option value="" disabled>Select Region</option>
                  {regionsData.map((r) => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">District</label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedRegion}
                  className="w-full h-12 px-4 appearance-none rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all disabled:opacity-50"
                >
                  <option value="" disabled>Select District</option>
                  {activeDistricts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700">Town/City</label>
              <input
                type="text"
                value={townCity}
                onChange={(e) => setTownCity(e.target.value)}
                placeholder="e.g. Sunyani"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white text-zinc-900 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
              />
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className={`w-full h-12 rounded-xl border border-gray-200 text-black font-medium text-sm transition-all flex items-center justify-center gap-2 mt-2 ${isDetecting ? 'bg-zinc-100 animate-pulse cursor-wait opacity-80 text-zinc-500' : 'bg-white hover:bg-zinc-50 pressable'}`}
              >
                {isDetecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {isDetecting ? 'Detecting Location...' : 'Use My Current Location'}
              </button>
            </div>

            {locationDetected && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100 mt-4"
              >
                <MapPin className="w-4 h-4" />
                ✓ Location detected: {locationDetected.town}, {locationDetected.region}
              </motion.div>
            )}

          </div>

          <div className="mt-10">
            <button
              onClick={handleNext}
              disabled={!isValid || isSaving}
              className="w-full bg-black text-white h-12 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 pressable mt-6"
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
