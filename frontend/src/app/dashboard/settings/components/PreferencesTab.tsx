'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { updateProfile } from '@/app/profile/actions';

export default function PreferencesTab({ initialData }: { initialData: any }) {
  const [transportPreference, setTransportPreference] = useState(initialData?.transport_preference || '');
  const [maxCommuteMinutes, setMaxCommuteMinutes] = useState(initialData?.max_commute_minutes || 45);
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    
    const result = await updateProfile({
      transport_preference: transportPreference,
      max_commute_minutes: parseInt(maxCommuteMinutes as any),
    });
    
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <div>
      <h2 className="heading-md mb-6">App & Travel Preferences</h2>
      
      <div className="space-y-8 max-w-xl">
        
        {/* App Appearance */}
        <div>
          <h3 className="heading-sm mb-3">Appearance</h3>
          <div className="p-4 rounded-md border border-hairline bg-canvas flex items-center justify-between">
            <div>
              <p className="font-medium text-ink text-sm">Theme</p>
              <p className="text-sm text-ink-mute">Toggle between light and dark mode</p>
            </div>
            
            {mounted && (
              <div className="flex bg-canvas-soft border border-hairline p-1 rounded-full">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-full transition-colors ${theme === 'light' ? 'bg-white shadow-sm text-ink border border-hairline-input' : 'text-ink-mute hover:text-ink'}`}
                >
                  <Sun className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-ink shadow-sm text-canvas border border-ink-mute' : 'text-ink-mute hover:text-ink'}`}
                >
                  <Moon className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <hr className="border-hairline" />

        {/* Transport Preferences */}
        <div>
          <h3 className="heading-sm mb-4">Travel Details</h3>
          
          <div className="space-y-6">
            <div>
              <label className={labelClassName}>Primary Mode of Transport</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'PUBLIC', label: 'Public Transport', desc: 'Trotro, Taxi, Uber' },
                  { id: 'OWN', label: 'Private Vehicle', desc: 'Personal Car, Motorcycle' }
                ].map((mode) => (
                  <div 
                    key={mode.id}
                    onClick={() => setTransportPreference(mode.id)}
                    className={`p-4 rounded-md cursor-pointer border transition-all ${
                      transportPreference === mode.id 
                        ? 'border-primary bg-primary-subdued/10 shadow-sm' 
                        : 'border-hairline-input bg-canvas hover:border-ink-mute hover:bg-canvas-soft'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`font-semibold text-[14px] ${transportPreference === mode.id ? 'text-primary-deep' : 'text-ink'}`}>
                        {mode.label}
                      </span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${
                        transportPreference === mode.id ? 'border-primary' : 'border-ink-mute'
                      }`}>
                        {transportPreference === mode.id && <div className="w-2 h-2 bg-primary rounded-full" />}
                      </div>
                    </div>
                    <p className="caption text-ink-mute">{mode.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[13px] font-medium text-ink-secondary">Maximum Daily Commute</label>
                <span className="text-[13px] font-semibold text-primary">{maxCommuteMinutes} mins</span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={maxCommuteMinutes}
                onChange={(e) => setMaxCommuteMinutes(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-canvas-soft rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 caption text-ink-mute">
                <span>15 min</span>
                <span>2 hours+</span>
              </div>
            </div>
            
            <div className="pt-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="button-primary min-h-[44px] px-6 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Preferences'}
              </button>
              
              {success && (
                <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Preferences saved successfully!
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
