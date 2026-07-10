'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { updateProfile } from '@/app/profile/actions';

const PROGRAMMES = [
  // Technical & Engineering
  { id: 'B.Sc. Automotive Engineering Technology with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Mechanical Engineering Technology with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Electrical and Electronics Engineering with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Construction Technology and Management with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Wood Technology with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Welding and Fabrication Technology with Education', category: 'Technical & Engineering' },
  { id: 'B.Sc. Renewable Energy Technology with Education', category: 'Technical & Engineering' },

  // Business & Economics
  { id: 'B.Sc. Accounting Education', category: 'Business & Economics' },
  { id: 'B.Sc. Economics Education', category: 'Business & Economics' },
  { id: 'B.Sc. Economics with Social Studies Education', category: 'Business & Economics' },
  { id: 'B.Sc. Management Education', category: 'Business & Economics' },
  { id: 'B.Sc. Entrepreneurship Education', category: 'Business & Economics' },

  // Vocational, Arts & IT
  { id: 'B.Sc. Catering and Hospitality Education', category: 'Vocational, Arts & IT' },
  { id: 'B.Sc. Fashion Design and Textiles Education', category: 'Vocational, Arts & IT' },
  { id: 'B.Sc. Mathematics Education', category: 'Vocational, Arts & IT' },
  { id: 'B.Sc. Information Technology Education', category: 'Vocational, Arts & IT' },
];

export default function PreferencesTab({ initialData }: { initialData: any }) {
  const [universityProgramme, setUniversityProgramme] = useState(initialData?.university_programme || '');
  
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
      university_programme: universityProgramme,
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
      <h2 className="heading-md mb-6">App & Placement Preferences</h2>
      
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

        {/* University Programme */}
        <div>
          <h3 className="heading-sm mb-4">University Programme</h3>
          
          <div className="space-y-6">
            <div>
              <label className={labelClassName}>Your Enrolled Programme</label>
              <p className="text-[13px] text-ink-mute mb-4">
                We use this to calculate highly accurate match scores for schools that offer subjects relevant to your teaching specialty.
              </p>
              
              <select
                value={universityProgramme}
                onChange={(e) => setUniversityProgramme(e.target.value)}
                className="w-full bg-canvas border border-hairline-input rounded-md px-4 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value="">Select your programme...</option>
                {Array.from(new Set(PROGRAMMES.map(p => p.category))).map(category => (
                  <optgroup key={category} label={category}>
                    {PROGRAMMES.filter(p => p.category === category).map(prog => (
                      <option key={prog.id} value={prog.id}>{prog.id}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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
