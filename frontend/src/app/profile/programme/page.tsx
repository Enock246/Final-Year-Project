'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Loader2, ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Technical & Engineering',
  'Business & Economics',
  'Vocational',
  'Maths & IT'
];

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

  // Vocational
  { id: 'B.Sc. Catering and Hospitality Education', category: 'Vocational' },
  { id: 'B.Sc. Fashion Design and Textiles Education', category: 'Vocational' },

  // Maths & IT
  { id: 'B.Sc. Mathematics Education', category: 'Maths & IT' },
  { id: 'B.Sc. Information Technology Education', category: 'Maths & IT' },
];

export default function ProgrammeSetupPage() {
  const router = useRouter();
  const [selectedProgramme, setSelectedProgramme] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Accordion state: which category is currently open
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const saved = localStorage.getItem('profileSetupDraft');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.universityProgramme) {
            setSelectedProgramme(data.universityProgramme);
            // Optionally auto-open the category of the saved programme
            const cat = PROGRAMMES.find(p => p.id === data.universityProgramme)?.category;
            if (cat) setOpenCategory(cat);
          }
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
            .select('university_programme')
            .eq('student_id', user.id)
            .single();

          if (data && data.university_programme) {
            setSelectedProgramme(data.university_programme);
            const cat = PROGRAMMES.find(p => p.id === data.university_programme)?.category;
            if (cat) setOpenCategory(cat);
          }
        }
      } catch (err) {
        console.error('Error fetching DB profile', err);
      }
    }
    loadData();
  }, []);

  const handleFinalSubmit = async () => {
    setIsSaving(true);
    
    const draft = JSON.parse(localStorage.getItem('profileSetupDraft') || '{}');
    localStorage.setItem('profileSetupDraft', JSON.stringify({
      ...draft,
      universityProgramme: selectedProgramme
    }));

    const { updateProfile } = await import('../actions');
    const result = await updateProfile({
      university_programme: selectedProgramme
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

  const toggleCategory = (category: string) => {
    if (openCategory === category) {
      setOpenCategory(null);
    } else {
      setOpenCategory(category);
    }
  };

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 bg-canvas-soft min-h-screen items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          className="w-full bg-canvas px-5 pb-5 pt-10 md:p-8 md:pt-12 rounded-xl shadow-none border border-hairline flex flex-col overflow-hidden relative"
        >
          
          <button 
            onClick={handleBack}
            className="absolute top-4 left-5 md:top-6 md:left-8 text-[13px] font-medium text-ink-mute hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <div className="mb-2">
            <h1 className="heading-lg text-ink mb-1">Enrolled Programme</h1>
          </div>
          <p className="body-md text-ink-mute mb-8 text-balance">
            Select your university programme to find high schools offering your teaching subjects.
          </p>

          <div className="space-y-3 mb-auto">
            {CATEGORIES.map((category) => {
              const isOpen = openCategory === category;
              const hasSelection = PROGRAMMES.filter(p => p.category === category).some(p => p.id === selectedProgramme);
              
              return (
                <div key={category} className={`border rounded-lg transition-all ${isOpen ? 'border-primary ring-1 ring-primary/10 shadow-sm' : 'border-hairline hover:border-ink-mute'}`}>
                  {/* Category Header / Trigger */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 bg-canvas text-left rounded-lg transition-colors focus:outline-none"
                  >
                    <div className="flex flex-col">
                      <span className={`text-[14px] font-semibold tracking-wide ${isOpen || hasSelection ? 'text-primary' : 'text-ink-secondary'}`}>
                        {category}
                      </span>
                      {hasSelection && !isOpen && (
                         <span className="text-[12px] text-ink-mute truncate mt-1 max-w-[250px]">
                           {selectedProgramme}
                         </span>
                      )}
                    </div>
                    <div className={`p-1.5 rounded-full transition-colors ${isOpen ? 'bg-primary-subdued/10 text-primary' : 'bg-canvas-soft text-ink-mute'}`}>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown / Accordion Content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 border-t border-hairline bg-canvas-soft/50 rounded-b-lg">
                          {PROGRAMMES.filter(p => p.category === category).map((prog) => {
                            const isSelected = selectedProgramme === prog.id;
                            return (
                              <button
                                key={prog.id}
                                onClick={() => {
                                  setSelectedProgramme(prog.id);
                                  // Auto close after selection (optional)
                                  setOpenCategory(null);
                                }}
                                className={`w-full flex items-center justify-between p-3 text-left rounded-md transition-colors ${
                                  isSelected 
                                    ? 'bg-primary text-white shadow-sm' 
                                    : 'text-ink hover:bg-canvas'
                                }`}
                              >
                                <span className={`text-[13px] font-medium leading-snug ${isSelected ? 'text-white' : 'text-ink'}`}>
                                  {prog.id}
                                </span>
                                {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 z-10">
            <button
              onClick={handleFinalSubmit}
              disabled={!selectedProgramme || isSaving}
              className="w-full bg-primary text-white text-[16px] font-medium min-h-[48px] px-4 rounded-pill hover:bg-primary-press disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Save & Continue
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
