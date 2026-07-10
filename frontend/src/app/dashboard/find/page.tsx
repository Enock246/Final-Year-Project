'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Search, MapPin, Building, X, Filter, ChevronRight, Globe2, Mail, Phone, BookOpen, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ApplicationWizardModal from './components/ApplicationWizardModal';
import dynamic from 'next/dynamic';

const LiveMap = dynamic(() => import('./components/LiveMap'), { 
  ssr: false, 
  loading: () => <div className="w-full h-full bg-[var(--canvas-soft)] animate-pulse rounded-md" /> 
});

// Types based on our schema
type School = {
  id: string;
  name: string;
  school_type: string;
  region_id: string;
  town_city: string;
  logo_url: string;
  cover_image_url: string;
  history: string;
  contact_email: string;
  contact_phone: string;
  expected_interns: number;
  requirements: string;
  regions?: { name: string };
  districts?: { name: string };
  distance_km?: number | null;
  match_score?: number | null;
  has_applied?: boolean;
  school_lat?: number | null;
  school_lng?: number | null;
  student_lat?: number | null;
  student_lng?: number | null;
  head_name?: string;
  postal_address?: string;
  programs_offered?: string[];
};

const formatMatchScore = (score: number) => {
  if (score === 100) return '95-100';
  const lowerBound = Math.floor(score / 5) * 5;
  return `${lowerBound}-${lowerBound + 5}`;
};

const gradients = [
  'from-[#0D8ABC] to-[#0a6b94]',
  'from-[#6366F1] to-[#4338CA]',
  'from-[#3B82F6] to-[#1D4ED8]',
  'from-[#F59E0B] to-[#D97706]',
  'from-[#10B981] to-[#059669]',
  'from-[#8B5CF6] to-[#6D28D9]',
  'from-[#EC4899] to-[#BE185D]',
  'from-[#F43F5E] to-[#BE123C]',
  'from-[#14B8A6] to-[#0F766E]',
];

const avatarColors = [
  '0D8ABC', '6366F1', '3B82F6', 'F59E0B', '10B981', '8B5CF6', 'EC4899', 'F43F5E', '14B8A6'
];

const getSchoolHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

const getSchoolGradient = (name: string) => {
  return gradients[getSchoolHash(name) % gradients.length];
};

const getSchoolAvatarUrl = (name: string) => {
  const color = avatarColors[getSchoolHash(name) % avatarColors.length];
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color}&color=fff&size=256&font-size=0.4&bold=true`;
};

function NewApplicationContent() {
  const searchParams = useSearchParams();
  const applySchoolId = searchParams.get('apply');

  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showApplyWizard, setShowApplyWizard] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  
  // Mobile Filter Sidebar State
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Details Modal State
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchSchools() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_all_schools_with_scores', { student_uuid: user.id });
      
      const { data: apps } = await supabase.from('applications').select('school_id, status').eq('student_id', user.id);
      
      const activeStatuses = ['PENDING', 'DELIVERED', 'OPENED', 'ACCEPTED'];
      const appliedSchoolIds = new Set(
        apps?.filter(a => activeStatuses.includes(a.status)).map(a => a.school_id) || []
      );
        
      if (!error && data) {
        // Map the RPC data back to the structure expected by the UI
        const mappedSchools = data.map((s: any) => ({
          ...s,
          town_city: s.town,
          regions: { name: s.region },
          districts: { name: s.district },
          has_applied: appliedSchoolIds.has(s.id)
        })) as School[];
        
        setSchools(mappedSchools);
        
        // Auto-open application wizard if apply parameter is present
        if (applySchoolId) {
          const targetSchool = data.find((s: any) => s.id === applySchoolId);
          if (targetSchool) {
            setSelectedSchool(targetSchool as School);
            setShowApplyWizard(true);
          }
        }
      }
      setLoading(false);
    }
    fetchSchools();
  }, [supabase, applySchoolId]);

  // Derive filter options
  const regions = useMemo(() => {
    const uniqueRegions = new Set(schools.map(s => s.regions?.name).filter(Boolean));
    return Array.from(uniqueRegions).sort();
  }, [schools]);

  const towns = useMemo(() => {
    // If a region is selected, only show towns in that region
    let filteredSchools = schools;
    if (selectedRegion) {
      filteredSchools = schools.filter(s => s.regions?.name === selectedRegion);
    }
    const uniqueTowns = new Set(filteredSchools.map(s => s.town_city).filter(Boolean));
    return Array.from(uniqueTowns).sort();
  }, [schools, selectedRegion]);

  // Filtered Schools
  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRegion = selectedRegion ? school.regions?.name === selectedRegion : true;
      const matchesTown = selectedTown ? school.town_city === selectedTown : true;
      return matchesSearch && matchesRegion && matchesTown;
    });
  }, [schools, searchQuery, selectedRegion, selectedTown]);

  return (
    <div className="w-full animate-in fade-in duration-500 max-w-[1400px] mx-auto pb-24">
      
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:justify-between xl:items-end mb-10 gap-6">
        <div>
          <h1 className="display-lg text-[var(--ink)] mb-3">Find a School</h1>
          <p className="body-lg text-[var(--ink-mute)]">Search our verified database and apply for your placement.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-mute)]" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by school name..."
              className="w-full h-12 bg-white border border-[var(--hairline)] rounded-md pl-11 pr-4 text-[15px] text-[var(--ink)] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-sm"
            />
          </div>
          
          <div className="hidden lg:flex items-center gap-3">
            <select 
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedTown('');
              }}
              className="h-12 px-4 bg-white border border-[var(--hairline)] rounded-md text-[14px] font-medium focus:outline-none focus:border-[var(--primary)] text-[var(--ink)] shadow-sm appearance-none pr-10"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="">All Regions</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            
            <select 
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value)}
              className="h-12 px-4 bg-white border border-[var(--hairline)] rounded-md text-[14px] font-medium focus:outline-none focus:border-[var(--primary)] text-[var(--ink)] shadow-sm appearance-none pr-10"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="">All Towns</option>
              {towns.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            
            {(searchQuery || selectedRegion || selectedTown) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRegion('');
                  setSelectedTown('');
                }}
                className="text-[var(--ink-mute)] hover:text-[var(--primary)] p-2 transition-colors"
                title="Clear Filters"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col relative">
        
        {/* Mobile Floating Action Button */}
        <button 
          onClick={() => setShowMobileFilters(true)}
          className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--ink)] text-white px-6 py-3.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.24)] font-medium flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
          {(selectedRegion || selectedTown) && (
            <span className="w-5 h-5 rounded-full bg-white text-[var(--ink)] text-xs flex items-center justify-center ml-1 font-bold">
              !
            </span>
          )}
        </button>

        {/* Sidebar Filters (Mobile Only Now) */}
        <aside className={`
          ${showMobileFilters ? 'fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm' : 'hidden'} 
          lg:hidden
        `}>
          
          <div className="bg-white rounded-t-[24px] w-full max-h-[85vh] p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading-md">Filters</h2>
              <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full hover:bg-[var(--canvas-soft)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto lg:overflow-visible pr-2 lg:pr-0">

              {/* Region */}
              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-[var(--ink)] uppercase tracking-wider">Region</label>
                <select 
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedTown(''); // Reset town when region changes
                  }}
                  className="w-full px-4 py-3 bg-white border border-[var(--hairline)] rounded-md text-[15px] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-sm appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="">All Regions</option>
                  {regions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Town */}
              <div className="space-y-3">
                <label className="text-[13px] font-semibold text-[var(--ink)] uppercase tracking-wider">Town / City</label>
                <select 
                  value={selectedTown}
                  onChange={(e) => setSelectedTown(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[var(--hairline)] rounded-md text-[15px] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-sm appearance-none"
                  style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                >
                  <option value="">All Towns</option>
                  {towns.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(searchQuery || selectedRegion || selectedTown) && (
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRegion('');
                    setSelectedTown('');
                  }}
                  className="text-[var(--primary)] font-medium text-[14px] hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {/* Mobile Apply Filters Button */}
            <div className="mt-auto pt-6 lg:hidden">
              <button 
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-[var(--primary)] text-white py-3.5 rounded-md font-semibold shadow-sm"
              >
                Show {filteredSchools.length} Schools
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content: School Grid */}
        <div className="flex-1 w-full">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-[var(--hairline)] p-6 h-[200px] animate-pulse">
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-16 bg-[var(--canvas-soft)] rounded-md"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-[var(--canvas-soft)] rounded w-3/4"></div>
                      <div className="h-4 bg-[var(--canvas-soft)] rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-32 bg-white rounded-2xl border border-[var(--hairline)] border-dashed">
              <div className="w-20 h-20 bg-[var(--canvas-soft)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8 text-[var(--ink-mute)]" />
              </div>
              <h2 className="heading-lg text-[var(--ink)] mb-3">No schools found</h2>
              <p className="body-lg text-[var(--ink-mute)] max-w-md mx-auto mb-8">
                We couldn't find any schools matching your filters. Try adjusting your search criteria.
              </p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedRegion('');
                  setSelectedTown('');
                }}
                className="px-6 py-2.5 bg-white border border-[var(--hairline)] rounded-md font-medium shadow-sm hover:bg-[var(--canvas-soft)] transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-[15px] text-[var(--ink-mute)] font-medium">
                  Showing <span className="text-[var(--ink)] font-semibold">{filteredSchools.length}</span> schools
                </p>
              </div>
              
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6"
                variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                initial="hidden"
                animate="show"
              >
                {filteredSchools.map((school) => (
                  <motion.div 
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 30, scale: 0.95 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", bounce: 0.3, duration: 0.6 } }
                    }}
                    key={school.id}
                    className="bg-[var(--canvas-soft)] rounded-2xl border border-[var(--hairline)] p-6 sm:p-8 hover:shadow-none hover:border-[var(--hairline-input)] pressable hover:-translate-y-1.5 cursor-pointer flex flex-col group relative overflow-hidden"
                    onClick={() => setSelectedSchool(school)}
                  >
                    <div className="flex items-start gap-5">
                      <div className="w-[72px] h-[72px] shrink-0 rounded-md border border-[var(--hairline)] bg-white shadow-sm overflow-hidden relative">
                        {school.logo_url ? (
                          <Image src={school.logo_url} alt={school.name} fill className="object-cover" />
                        ) : (
                          <Image src={getSchoolAvatarUrl(school.name)} alt={school.name} fill className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="heading-md text-[var(--ink)] mb-2 line-clamp-2 leading-tight group-hover:text-[var(--primary)] transition-colors">{school.name}</h3>
                          {school.match_score !== undefined && school.match_score !== null && (
                            <div className="flex flex-col items-end shrink-0">
                              <span className="text-[14px] font-bold text-[var(--primary)]">{formatMatchScore(school.match_score)}% Match</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-[var(--ink-mute)]">
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <MapPin className="w-4 h-4" />
                            {school.town_city}, {school.regions?.name}
                            {school.distance_km !== undefined && school.distance_km !== null && (
                              <span> • {school.distance_km.toFixed(1)}km away</span>
                            )}
                          </span>
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            <BookOpen className="w-4 h-4" />
                            {school.school_type || 'Public'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-5 border-t border-[var(--hairline)] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary-bg-subdued)] text-[var(--primary-deep)] text-[13px] font-medium rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                        Accepting Interns
                      </span>
                      <span className="text-[14px] font-medium text-[var(--primary)] flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                        View Details <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* School Details Modal */}
      <AnimatePresence>
      {selectedSchool && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedSchool(null)}
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
            className="relative w-full max-w-[800px] max-h-[90vh] bg-white rounded-2xl shadow-level-3 overflow-hidden flex flex-col"
          >
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedSchool(null)}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Scrollable Content */}
            <div className="overflow-y-auto">
              
              {/* Massive Header Cover Image */}
              <div className="relative h-[250px] sm:h-[300px] w-full bg-[var(--canvas-soft)]">
                {selectedSchool.cover_image_url ? (
                  <Image src={selectedSchool.cover_image_url} alt="Cover" fill className="object-cover" />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${getSchoolGradient(selectedSchool.name)}`} />
                )}
                
                {/* Overlapping Badge */}
                <div className="absolute -bottom-12 left-8 sm:left-12 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
                   {selectedSchool.logo_url ? (
                     <Image src={selectedSchool.logo_url} alt={selectedSchool.name} fill className="object-cover" />
                   ) : (
                     <Image src={getSchoolAvatarUrl(selectedSchool.name)} alt={selectedSchool.name} fill className="object-cover" />
                   )}
                </div>
              </div>

              {/* Body Content */}
              <div className="pt-16 pb-12 px-8 sm:px-12">
                
                {/* Title & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
                  <div>
                    <h2 className="display-sm text-[var(--ink)] mb-2">{selectedSchool.name}</h2>
                    <p className="text-[16px] text-[var(--ink-mute)] flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedSchool.town_city}, {selectedSchool.regions?.name} Region
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedSchool.has_applied) {
                        alert("You already have an active application to this school.");
                      } else {
                        setSelectedSchool(selectedSchool);
                        setShowApplyWizard(true);
                      }
                    }}
                    className={`pressable w-full sm:w-auto shrink-0 px-8 py-3.5 text-[15px] font-semibold rounded-md shadow-sm transition-all ${
                      selectedSchool.has_applied 
                        ? 'bg-[var(--canvas-soft)] text-[var(--ink-mute)] cursor-not-allowed border border-[var(--hairline)]' 
                        : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)] hover:-translate-y-0.5'
                    }`}
                  >
                    {selectedSchool.has_applied ? 'Already Applied' : 'Apply Now'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {/* Left Column: History & Details */}
                  <div className="md:col-span-2 space-y-10">
                    
                    <section>
                      <h3 className="heading-md text-[var(--ink)] mb-4">About the School</h3>
                      <div className="prose prose-p:text-[var(--ink-mute)] prose-p:leading-relaxed text-[16px]">
                        <p>{selectedSchool.history || "No history information available for this school."}</p>
                      </div>
                    </section>

                    {selectedSchool.programs_offered && selectedSchool.programs_offered.length > 0 && (
                      <section>
                        <h3 className="heading-md text-[var(--ink)] mb-4">Programs Offered</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedSchool.programs_offered.map((program, idx) => (
                            <span key={idx} className="px-3 py-1.5 bg-[var(--canvas-soft)] border border-[var(--hairline)] text-[var(--ink)] text-[14px] rounded-lg shadow-sm font-medium">
                              {program}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Moved Location Section to Left Column */}
                    <section className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 shadow-sm flex flex-col">
                      <h3 className="text-[14px] font-bold text-[var(--ink)] mb-4 uppercase tracking-wider">Location</h3>
                      <div className="relative w-full h-[250px] bg-[var(--canvas-soft)] rounded-md mb-4 overflow-hidden border border-[var(--hairline)] flex-shrink-0 z-0">
                        {selectedSchool.school_lat && selectedSchool.school_lng && selectedSchool.student_lat && selectedSchool.student_lng ? (
                          <LiveMap 
                            schoolLat={selectedSchool.school_lat}
                            schoolLng={selectedSchool.school_lng}
                            studentLat={selectedSchool.student_lat}
                            studentLng={selectedSchool.student_lng}
                            schoolName={selectedSchool.name}
                            distanceKm={selectedSchool.distance_km || 0}
                          />
                        ) : (
                          <>
                            {/* Map Placeholder */}
                            <div className="absolute inset-0 opacity-40 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Ghana&zoom=6&size=400x200&maptype=roadmap&style=feature:all|element:labels|visibility:off&style=feature:road|element:geometry|color:0xffffff&style=feature:landscape|element:geometry|color:0xf5f5f5&style=feature:water|element:geometry|color:0xe0e0e0')] bg-cover bg-center" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                                <MapPin className="w-5 h-5 text-[var(--primary)]" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[14px] font-semibold text-[var(--ink)]">{selectedSchool.town_city || 'Town/City Not Specified'}</p>
                        <p className="text-[13px] text-[var(--ink-mute)]">{selectedSchool.regions?.name ? `${selectedSchool.regions.name} Region` : 'Region Not Specified'}</p>
                        {selectedSchool.districts?.name && (
                          <p className="text-[13px] text-[var(--ink-mute)]">{selectedSchool.districts.name} District</p>
                        )}
                      </div>
                    </section>


                  </div>

                  {/* Right Column: Meta Info */}
                  <div className="space-y-6">
                    <section className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 shadow-sm">
                      <h3 className="text-[14px] font-bold text-[var(--ink)] mb-4 uppercase tracking-wider">Contact Info</h3>
                      
                      <div className="space-y-4">
                        {selectedSchool.contact_email ? (
                          <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-[var(--ink-mute)] shrink-0" />
                            <div className="min-w-0">
                              <a href={`mailto:${selectedSchool.contact_email}`} className="text-[14px] font-medium text-[var(--primary)] hover:underline truncate block">
                                {selectedSchool.contact_email}
                              </a>
                              <p className="text-[13px] text-[var(--ink-mute)]">Email</p>
                            </div>
                          </div>
                        ) : null}
                        
                        {selectedSchool.contact_phone ? (
                          <div className="flex items-start gap-3">
                            <Phone className="w-5 h-5 text-[var(--ink-mute)] shrink-0" />
                            <div className="min-w-0">
                              <a href={`tel:${selectedSchool.contact_phone.replace(/\s+/g, '')}`} className="text-[14px] font-medium text-[var(--primary)] hover:underline truncate block">
                                {selectedSchool.contact_phone}
                              </a>
                              <p className="text-[13px] text-[var(--ink-mute)]">Phone</p>
                            </div>
                          </div>
                        ) : null}

                        {!selectedSchool.contact_email && !selectedSchool.contact_phone && !selectedSchool.postal_address && (
                          <p className="text-[14px] text-[var(--ink-mute)] italic">No contact information available.</p>
                        )}
                      </div>
                    </section>

                    {selectedSchool.head_name || selectedSchool.postal_address ? (
                      <section className="bg-white border border-[var(--hairline)] rounded-[20px] p-6 shadow-sm">
                        <h3 className="text-[14px] font-bold text-[var(--ink)] mb-4 uppercase tracking-wider">Administration</h3>
                        <div className="space-y-4">
                          {selectedSchool.head_name && (
                            <div className="flex flex-col">
                              <span className="text-[13px] text-[var(--ink-mute)] mb-1">Head of School</span>
                              <span className="text-[15px] font-semibold text-[var(--ink)]">{selectedSchool.head_name}</span>
                            </div>
                          )}
                          {selectedSchool.postal_address && (
                            <div className="flex flex-col">
                              <span className="text-[13px] text-[var(--ink-mute)] mb-1">Postal Address</span>
                              <span className="text-[14px] text-[var(--ink)]">{selectedSchool.postal_address}</span>
                            </div>
                          )}
                        </div>
                      </section>
                    ) : null}


                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {selectedSchool && (
        <ApplicationWizardModal 
          isOpen={showApplyWizard}
          onClose={() => setShowApplyWizard(false)}
          school={selectedSchool}
          hasApplied={selectedSchool?.has_applied}
        />
      )}
    </div>
  );
}

export default function NewApplicationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <NewApplicationContent />
    </Suspense>
  );
}
