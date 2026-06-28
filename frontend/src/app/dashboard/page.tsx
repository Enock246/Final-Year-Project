'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import { mockStudentStats, mockSchools } from '@/lib/mockData';
import { createClient } from '@/utils/supabase/client';
import { FileText, CheckCircle2, ChevronRight, School, MoreVertical, MessageSquare, AlertCircle, CheckCircle, Clock, MapPin, Sparkles, Map, Trash2, Eye } from 'lucide-react';
import ApplicationDetailsDrawer from './components/ApplicationDetailsDrawer';
import InboxMessageDrawer from './components/InboxMessageDrawer';
import AllMessagesDrawer from './components/AllMessagesDrawer';

export const parseMessageContent = (msg: any) => {
  if (!msg || !msg.subject) return { heading: 'System', body: msg?.content || '', initials: 'S', rawSchoolName: 'System', cliffhanger: '' };
  
  const rawSchoolName = msg.subject.replace(/^(Re:\s*)+/gi, '').replace('Application Sent to ', '').replace('!', '').trim() || 'System';
  let heading = rawSchoolName;
  let body = msg.content || '';
  
  const prefixMatch = body.match(/^((?:Reply from|Update from|Message from)[^:]+:\s*)(.*)/is);
  if (prefixMatch) {
    heading = prefixMatch[1].trim(); 
    body = prefixMatch[2].trim();    
  }
  
  const initials = rawSchoolName.substring(0, 1).toUpperCase();
  const cliffhanger = body.split(' ').slice(0, 8).join(' ') + '...';
  
  return { heading, body, rawSchoolName, initials, cliffhanger };
};

const getRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return date.toLocaleDateString();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-amber-100 text-amber-700 border-amber-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatMatchScore = (score: number) => {
  if (score === 100) return '95-100';
  const lowerBound = Math.floor(score / 5) * 5;
  return `${lowerBound}-${lowerBound + 5}`;
};

function DashboardContent() {
  const [nearbySchools, setNearbySchools] = useState<any[]>(mockSchools.slice(0, 4));
  const [isLoadingSchools, setIsLoadingSchools] = useState(true);
  const [totalSchools, setTotalSchools] = useState<number>(0);
  
  // Real Applications State
  const [activeApps, setActiveApps] = useState<any[]>([]);
  const [totalApplications, setTotalApplications] = useState<number>(0);
  const [totalResponses, setTotalResponses] = useState<number>(0);
  const [remainingSlots, setRemainingSlots] = useState<number>(3);
  const [hasApplied, setHasApplied] = useState(false);
  const [inboxMessages, setInboxMessages] = useState<any[]>([]);
  const [docStatus, setDocStatus] = useState({ cv: false, transcript: false, placementLetter: false });
  const [analytics, setAnalytics] = useState<any>(null);

  // Drawer & Menu State
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInboxDrawerOpen, setIsInboxDrawerOpen] = useState(false);
  const [isAllMessagesOpen, setIsAllMessagesOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMessageClick = async (msg: any) => {
    setSelectedApp(msg);
    setIsInboxDrawerOpen(true);
    
    if (!msg.is_read) {
      setInboxMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
      const supabase = createClient();
      await supabase.from('inbox_messages').update({ is_read: true }).eq('id', msg.id);
    }
  };

  const handleDeleteMessage = async (e: React.MouseEvent | React.PointerEvent, id: string) => {
    e.stopPropagation();
    setInboxMessages(prev => prev.filter(m => m.id !== id));
    const supabase = createClient();
    await supabase.from('inbox_messages').delete().eq('id', id);
  };

  const handleClearAllMessages = async () => {
    setInboxMessages([]);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('inbox_messages').delete().eq('student_id', user.id);
    }
    setIsAllMessagesOpen(false);
  };

  const handleHardDelete = async (appId: string) => {
    const supabase = createClient();
    await supabase.from('applications').delete().eq('id', appId);
    const updatedApps = activeApps.filter((a: any) => (a.application_id || a.id) !== appId);
    setActiveApps(updatedApps);
    setTotalApplications(prev => Math.max(0, prev - 1));
    setRemainingSlots(prev => Math.min(3, prev + 1));
    setOpenDropdownId(null);
  };

  // Unblur content if the user has applied to 3 or more schools (using total applications)
  const hasMetMinimum = totalApplications >= 3;

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      
      // Get total schools count
      const { count } = await supabase.from('schools').select('*', { count: 'exact', head: true });
      if (count !== null) setTotalSchools(count);

      // Fetch nearby schools based on current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch User Profile Documents
        const { data: profile } = await supabase.from('student_profiles').select('cv_file_path, transcript_file_path, placement_letter_path').eq('student_id', user.id).single();
        if (profile) {
          setDocStatus({
            cv: !!profile.cv_file_path,
            transcript: !!profile.transcript_file_path,
            placementLetter: !!profile.placement_letter_path
          });
        }

        // Fetch Real Applications
        const { data: userApps, error: userAppsError } = await supabase.rpc('get_active_applications_with_scores', { student_uuid: user.id });
        console.log("Active Apps RPC:", userApps, userAppsError);
          
        if (userApps && userApps.length > 0) {
          const formattedApps = userApps.map((app: any) => ({
            ...app,
            name: app.school_name || 'Unknown School',
            region: app.region || 'Unknown Region',
            date: new Date(app.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            stage: app.status === 'PENDING' ? 'Pending' : 
                   app.status === 'OPENED' ? 'Opened' :
                   app.status === 'REPLIED' ? 'Replied' :
                   app.status === 'ACCEPTED' ? 'Accepted' : 'Rejected',
            match: app.match_score !== null && app.match_score !== undefined ? app.match_score : 'N/A'
          }));
          setActiveApps(formattedApps.slice(0, 5));
          setTotalApplications(formattedApps.length);
          setRemainingSlots(Math.max(0, 3 - formattedApps.length));
          setHasApplied(true);
        } else {
          setActiveApps([]);
          setTotalApplications(0);
          setRemainingSlots(3);
          setHasApplied(false);
        }

        // Fetch Total Responses (Best Practice: Use count query instead of JS filter on sliced data)
        const { count: responsesCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .in('status', ['REPLIED', 'ACCEPTED', 'REJECTED']);
        if (responsesCount !== null) setTotalResponses(responsesCount);

        // Fetch Inbox Messages
        const { data: messagesData } = await supabase
          .from('inbox_messages')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        
        if (messagesData) {
          setInboxMessages(messagesData);
        }

        // Fetch Placement Analytics
        const { data: analyticsData, error: analyticsError } = await supabase.rpc('get_student_analytics_summary', { student_uuid: user.id });
        console.log('Analytics RPC:', analyticsData, analyticsError);
        if (analyticsData) setAnalytics(analyticsData);

        const { data, error } = await supabase.rpc('get_nearby_schools', { student_uuid: user.id, limit_count: 4 });
        console.log('Dashboard RPC result:', { data, error, userId: user.id });
        
        if (data && !error && data.length > 0) {
          const mapped = data.map((school: any) => ({
            id: school.id,
            name: school.name,
            location: { region: school.region, district: school.district, town: school.town },
            distance_km: school.distance_km,
            matchScore: school.match_score,
            logo_url: school.logo_url,
            cover_image_url: school.cover_image_url,
            history: school.history,
            stats: { pastInterns: (school.name.length % 20) + 1, offerRate: (school.name.length % 40) + 50 }
          }));
          setNearbySchools(mapped);
        } else {
          // Fallback if the user has no location set yet
          const { data: randomSchools } = await supabase.from('schools')
            .select('id, name, town_city, regions(name), districts(name), logo_url, cover_image_url, history')
            .limit(4);
            
          if (randomSchools && randomSchools.length > 0) {
            setNearbySchools(randomSchools.map(s => ({
              id: s.id,
              name: s.name,
              location: { region: (s.regions as any)?.name, district: (s.districts as any)?.name, town: s.town_city },
              distance_km: null,
              matchScore: null,
              logo_url: s.logo_url,
              cover_image_url: s.cover_image_url,
              history: s.history,
              stats: { pastInterns: 5, offerRate: 70 }
            })));
          }
        }
      }
      setIsLoadingSchools(false);
    }
    fetchData();
  }, []);

  return (
    <div className="w-full animate-in fade-in duration-500 max-w-[1000px] mx-auto pb-12">
      
      {/* Greeting Row */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="display-md text-[var(--ink)] mb-1">Dashboard</h1>
          <p className="body-md text-[var(--ink-mute)]">Overview of your internship placement progress.</p>
        </div>
        <Link href={`/dashboard/find`} className="button-primary-pill w-full md:w-fit text-center flex items-center justify-center">
          New Application
        </Link>
      </div>

      {/* Stats Cards (Mobile Horizontal Snap Carousel) */}
      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
        <div className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas)] rounded-[24px] p-6 shadow-level-1 border border-[var(--hairline)] hover:shadow-level-2 transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <span className="body-md font-medium text-[var(--ink-secondary)]">Applications</span>
            <div className="w-10 h-10 rounded-full bg-[var(--canvas-soft)] flex items-center justify-center border border-[var(--hairline)] shrink-0">
              <FileText className="w-5 h-5 text-[var(--ink-mute)]" />
            </div>
          </div>
          <span className="display-lg text-[var(--ink)]">{totalApplications}</span>
        </div>

        <div className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas)] rounded-[24px] p-6 shadow-level-1 border border-[var(--hairline)] hover:shadow-level-2 transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <span className="body-md font-medium text-[var(--ink-secondary)]">Responses</span>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border shrink-0 ${totalResponses > 0 ? 'bg-success/10 border-success/20' : 'bg-[var(--canvas-soft)] border-[var(--hairline)]'}`}>
              <CheckCircle2 className={`w-5 h-5 ${totalResponses > 0 ? 'text-[var(--success)]' : 'text-[var(--ink-mute)]'}`} />
            </div>
          </div>
          <span className="display-lg text-[var(--ink)]">{totalResponses}</span>
        </div>

        <div className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas)] rounded-[24px] p-6 shadow-level-1 border border-[var(--hairline)] hover:shadow-level-2 transition-shadow">
          <div className="flex items-center justify-between mb-6">
            <span className="body-md font-medium text-[var(--ink-secondary)]">Available</span>
            <div className="w-10 h-10 rounded-full bg-[var(--primary-subdued)]/30 flex items-center justify-center border border-[var(--primary-subdued)]/50 shrink-0">
              <School className="w-5 h-5 text-[var(--primary)]" />
            </div>
          </div>
          <span className="display-lg text-[var(--ink)]">{totalSchools || 0}</span>
        </div>

        <div className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas)] rounded-[24px] p-6 shadow-level-1 border border-[var(--hairline)] hover:shadow-level-2 transition-shadow flex flex-col justify-between">
          <span className="body-md font-medium text-[var(--ink-secondary)] mb-4">Profile Status</span>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[var(--success)] shadow-[0_0_8px_var(--success)] shrink-0" />
            <span className="heading-sm text-[var(--ink)]">Verified</span>
          </div>
          <Link href="/profile/location" className="caption text-[var(--primary)] font-medium hover:text-[var(--primary-deep)] transition-colors mt-auto flex items-center gap-1">
            Update Preferences <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Recommendations Row (Always visible, Mobile Snap Carousel) */}
      <div className="mb-8">
        <h2 className="heading-md text-[var(--ink)] mb-4">Top Recommendations</h2>
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {nearbySchools.slice(0, 3).map((school, idx) => (
            <div key={idx} className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas)] rounded-[24px] shadow-level-1 border border-[var(--hairline)] p-5 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="micro-cap bg-[var(--canvas-soft)] text-[var(--ink)] border border-[var(--hairline)] px-2 py-1 rounded-md shrink-0 font-medium">
                    {formatMatchScore(school.matchScore)}% Match
                  </span>
                </div>
                <h3 className="body-md font-semibold text-[var(--ink)] line-clamp-1 mb-1">{school.name}</h3>
                <div className="flex items-center gap-1.5 text-[var(--ink-mute)] mb-6">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="caption truncate">{school.location.town}</span>
                </div>
              </div>
              <Link 
                href={`/dashboard/find?apply=${school.id}`}
                className="w-full bg-[var(--primary)] text-white h-10 rounded-pill flex items-center justify-center button-sm hover:bg-[var(--primary-press)] transition-colors"
              >
                Apply
              </Link>
            </div>
          ))}
          
          {/* Search for More Card */}
          <div className="w-[85%] min-w-[260px] max-w-[320px] shrink-0 sm:w-auto sm:min-w-0 snap-center bg-[var(--canvas-soft)] rounded-[24px] border border-[var(--hairline)] border-dashed p-5 flex flex-col items-center justify-center text-center hover:bg-[var(--canvas)] transition-colors">
            <div className="w-12 h-12 rounded-full bg-[var(--canvas)] border border-[var(--hairline)] shadow-sm flex items-center justify-center mb-4">
              <Map className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <h3 className="body-md font-medium text-[var(--ink)] mb-1">Search for more</h3>
            <p className="caption text-[var(--ink-mute)] mb-4">Browse the full map to find your perfect fit.</p>
            <Link 
              href="/dashboard/find"
              className="w-full bg-white text-[var(--ink)] border border-[var(--hairline)] h-10 rounded-pill flex items-center justify-center button-sm hover:border-[var(--ink-mute)] transition-colors"
            >
              Explore Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Row 2: Application Pipeline (Table on Desktop, Cards on Mobile) */}
      <div className="mb-8 bg-[var(--canvas)] rounded-[24px] shadow-level-1 border border-[var(--hairline)] overflow-visible">
        <div className="p-4 sm:p-6 border-b border-[var(--hairline)] flex items-center justify-between">
          <h2 className="heading-md text-[var(--ink)]">Active Applications</h2>
          <Link href="/dashboard/applications" className="button-sm text-[var(--primary)] hover:text-[var(--primary-deep)] shrink-0 ml-4">View all</Link>
        </div>
        
        {/* DESKTOP VIEW: Standard Table */}
        <div className="hidden md:block overflow-visible hide-scrollbar rounded-b-[24px]">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[var(--canvas-soft-2)] border-b border-[var(--hairline)]">
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold">School Name</th>
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold">Region</th>
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold">Date Applied</th>
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold">Stage</th>
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold">Match</th>
                <th className="py-4 px-6 caption text-[var(--ink-mute)] uppercase tracking-wider font-semibold text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-[var(--hairline)]">
              {activeApps.map((app, idx) => (
                <tr key={idx} className="hover:bg-[var(--canvas-soft)]/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 body-md font-medium text-[var(--ink)]">{app.name}</td>
                  <td className="py-4 px-6 body-md text-[var(--ink-mute)]">{app.region}</td>
                  <td className="py-4 px-6 body-tabular text-[var(--ink-mute)]">{app.date}</td>
                  <td className="py-4 px-6">
                    <span className={`pill-tag-soft ${
                      app.stage === 'Accepted' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                      app.stage === 'Opened' ? 'bg-blue-100 text-blue-700' :
                      app.stage === 'Replied' ? 'bg-purple-100 text-purple-700' :
                      app.stage === 'Interview' ? 'bg-[var(--primary-subdued)]/30 text-[var(--primary-deep)]' :
                      'bg-[var(--warning)]/10 text-[var(--warning)]'
                    }`}>
                      {app.stage}
                    </span>
                  </td>
                  <td className="py-4 px-6 body-tabular font-medium text-[var(--ink)]">
                    {app.match === 'N/A' ? 'N/A' : `${formatMatchScore(app.match as number)}%`}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="relative inline-block text-left" ref={openDropdownId === (app.application_id || app.id) ? dropdownRef : null}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === (app.application_id || app.id) ? null : (app.application_id || app.id)); }}
                        className="p-2 rounded-full hover:bg-[var(--canvas-soft)] transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-[var(--ink-mute)] group-hover:text-[var(--ink)] transition-colors" />
                      </button>
                      {openDropdownId === (app.application_id || app.id) && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-[var(--hairline)] rounded-xl shadow-level-2 z-[60] py-1 overflow-hidden">
                          <button 
                            onPointerDown={(e) => { e.stopPropagation(); setSelectedApp(app); setIsDrawerOpen(true); setOpenDropdownId(null); }}
                            className="w-full px-4 py-2 text-left text-[14px] flex items-center gap-2 hover:bg-[var(--canvas-soft)] text-[var(--ink)] font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4 text-[var(--ink-mute)]" /> View Details
                          </button>
                          <button 
                            onPointerDown={(e) => { e.stopPropagation(); handleHardDelete(app.application_id || app.id); }}
                            className="w-full px-4 py-2 text-left text-[14px] flex items-center gap-2 hover:bg-[var(--warning)]/10 text-[var(--warning)] font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Application
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {remainingSlots > 0 && (
                <tr className="relative">
                  <td colSpan={6} className="p-0">
                    <div className="relative">
                      <div className="opacity-30 blur-[4px] pointer-events-none select-none divide-y divide-[var(--hairline)]">
                        {Array.from({ length: remainingSlots }).map((_, i) => (
                          <div key={i} className="flex px-6 py-4 items-center gap-8">
                            <div className="h-5 bg-[var(--ink-mute)] rounded w-48 animate-pulse" />
                            <div className="h-5 bg-[var(--ink-mute)] rounded w-24 animate-pulse" />
                            <div className="h-5 bg-[var(--ink-mute)] rounded w-24 animate-pulse" />
                            <div className="h-6 bg-[var(--ink-mute)] rounded-pill w-20 animate-pulse" />
                            <div className="h-5 bg-[var(--ink-mute)] rounded w-12 animate-pulse" />
                            <div className="h-5 bg-[var(--ink-mute)] rounded w-5 ml-auto animate-pulse" />
                          </div>
                        ))}
                      </div>
                      <Link href="/dashboard/find" className="absolute inset-0 flex items-center justify-center z-10 p-4 group cursor-pointer">
                        <div className="bg-[var(--canvas)]/80 backdrop-blur-md px-6 py-3 rounded-pill shadow-level-1 border border-[var(--primary)]/30 flex items-center gap-3 group-hover:scale-105 group-hover:shadow-level-2 group-hover:border-[var(--primary)] transition-all duration-300">
                          <AlertCircle className="w-5 h-5 text-[var(--primary)]" />
                          <p className="body-md font-medium text-[var(--ink)]">
                            We recommend that you begin application for at least <span className="font-bold text-[var(--primary)]">{remainingSlots}</span> schools
                          </p>
                        </div>
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE VIEW: Card List */}
        <div className="md:hidden flex flex-col divide-y divide-[var(--hairline)]">
          {activeApps.map((app, idx) => (
            <div key={idx} className="p-4 hover:bg-[var(--canvas-soft)]/50 transition-colors cursor-pointer min-w-0">
              <div className="flex justify-between items-start mb-3 gap-2">
                <h3 className="body-md font-medium text-[var(--ink)] truncate">{app.name}</h3>
                <div className="relative" ref={openDropdownId === (app.application_id || app.id) ? dropdownRef : null}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === (app.application_id || app.id) ? null : (app.application_id || app.id)); }}
                    className="p-1 -mr-1 -mt-1 rounded-full hover:bg-[var(--canvas-soft)] transition-colors shrink-0"
                  >
                    <MoreVertical className="w-5 h-5 text-[var(--ink-mute)]" />
                  </button>
                  {openDropdownId === (app.application_id || app.id) && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-[var(--hairline)] rounded-xl shadow-level-2 z-[60] py-1 overflow-hidden">
                      <button 
                        onPointerDown={(e) => { e.stopPropagation(); setSelectedApp(app); setIsDrawerOpen(true); setOpenDropdownId(null); }}
                        className="w-full px-4 py-2 text-left text-[14px] flex items-center gap-2 hover:bg-[var(--canvas-soft)] text-[var(--ink)] font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4 text-[var(--ink-mute)]" /> View Details
                      </button>
                      <button 
                        onPointerDown={(e) => { e.stopPropagation(); handleHardDelete(app.application_id || app.id); }}
                        className="w-full px-4 py-2 text-left text-[14px] flex items-center gap-2 hover:bg-[var(--warning)]/10 text-[var(--warning)] font-medium transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Application
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="caption text-[var(--ink-mute)] truncate">{app.region} • {app.date}</span>
                  <span className="body-tabular font-medium text-[var(--ink)]">
                    {app.match === 'N/A' ? 'N/A' : `${formatMatchScore(app.match as number)}% Match`}
                  </span>
                </div>
                <span className={`pill-tag-soft shrink-0 ${
                  app.stage === 'Accepted' ? 'bg-[var(--success)]/10 text-[var(--success)]' :
                  app.stage === 'Opened' ? 'bg-blue-100 text-blue-700' :
                  app.stage === 'Replied' ? 'bg-purple-100 text-purple-700' :
                  app.stage === 'Interview' ? 'bg-[var(--primary-subdued)]/30 text-[var(--primary-deep)]' :
                  'bg-[var(--warning)]/10 text-[var(--warning)]'
                }`}>
                  {app.stage}
                </span>
              </div>
            </div>
          ))}

          {/* Mobile Blurred Remaining Slots */}
          {remainingSlots > 0 && (
            <div className="relative">
              <div className="opacity-30 blur-[4px] pointer-events-none select-none divide-y divide-[var(--hairline)]">
                {Array.from({ length: remainingSlots }).map((_, i) => (
                  <div key={i} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-4">
                      <div className="h-5 bg-[var(--ink-mute)] rounded w-full max-w-[200px] animate-pulse" />
                      <div className="h-5 bg-[var(--ink-mute)] rounded w-5 shrink-0 animate-pulse" />
                    </div>
                    <div className="flex justify-between items-end gap-4">
                      <div className="flex flex-col gap-1 w-full max-w-[150px]">
                        <div className="h-4 bg-[var(--ink-mute)] rounded w-full animate-pulse" />
                        <div className="h-5 bg-[var(--ink-mute)] rounded w-2/3 animate-pulse" />
                      </div>
                      <div className="h-6 bg-[var(--ink-mute)] rounded-pill w-20 shrink-0 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/dashboard/find" className="absolute inset-0 flex items-center justify-center z-10 p-4 group cursor-pointer">
                <div className="bg-[var(--canvas)]/85 backdrop-blur-md px-5 py-4 rounded-[16px] shadow-level-1 border border-[var(--primary)]/30 flex flex-col text-center items-center gap-2 group-hover:scale-105 group-hover:shadow-level-2 group-hover:border-[var(--primary)] transition-all duration-300">
                  <AlertCircle className="w-6 h-6 text-[var(--primary)]" />
                  <p className="body-md font-medium text-[var(--ink)]">
                    We recommend that you begin application for at least <span className="font-bold text-[var(--primary)]">{remainingSlots}</span> schools
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Data Section Wrapper */}
      <div className="space-y-6 sm:space-y-8">
        
        {/* Row 3: 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Left Col (2/3): Document Readiness Matrix */}
          <div className="lg:col-span-2 bg-[var(--canvas)] rounded-[24px] shadow-level-1 border border-[var(--hairline)] overflow-hidden relative">
            <div className={`transition-opacity duration-700 ${!hasMetMinimum ? 'opacity-30 select-none pointer-events-none blur-[4px]' : ''}`}>
              <div className="p-4 sm:p-6 border-b border-[var(--hairline)]">
                <h2 className="heading-md text-[var(--ink)]">Document Readiness</h2>
                <p className="caption text-[var(--ink-mute)] mt-1">Required files for your target schools.</p>
              </div>
              <div className="divide-y divide-[var(--hairline)]">
                {[
                  { doc: "Curriculum Vitae", verified: docStatus.cv, icon: FileText },
                  { doc: "Placement Letter", verified: docStatus.placementLetter, icon: CheckCircle },
                  { doc: "Academic Transcript", verified: docStatus.transcript, icon: Clock }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--canvas-soft)]/50 transition-colors">
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${item.verified ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--ruby)]/10 text-[var(--ruby)]'} flex items-center justify-center shrink-0 border border-[var(--hairline)]`}>
                        <item.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="body-md font-medium text-[var(--ink)] truncate">{item.doc}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                          <span className={`micro-cap shrink-0 ${item.verified ? 'text-[var(--success)]' : 'text-[var(--ruby)]'}`}>{item.verified ? 'Available' : 'Missing'}</span>
                          <span className="caption text-[var(--ink-mute)] hidden sm:inline shrink-0">•</span>
                          <span className="caption text-[var(--ink-mute)] truncate">Required for applications</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Section Overlay */}
            {!hasMetMinimum && (
              <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                <div className="bg-[var(--canvas)]/85 backdrop-blur-md px-5 py-4 rounded-[16px] shadow-level-1 border border-[var(--primary)]/30 flex flex-col text-center items-center gap-2 max-w-[280px]">
                  <AlertCircle className="w-6 h-6 text-[var(--primary)]" />
                  <p className="body-md font-medium text-[var(--ink)]">
                    Unlock <span className="font-bold text-[var(--ink)]">Readiness</span> by applying to <span className="font-bold text-[var(--primary)]">{remainingSlots}</span> more school{remainingSlots > 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Col (1/3): Communication Inbox */}
          <div className="bg-[var(--canvas)] rounded-[24px] shadow-level-1 border border-[var(--hairline)] flex flex-col relative overflow-hidden">
            <div className={`flex flex-col h-full transition-opacity duration-700 ${!hasMetMinimum ? 'opacity-30 select-none pointer-events-none blur-[4px]' : ''}`}>
              <div className="p-4 sm:p-6 border-b border-[var(--hairline)] flex items-center justify-between">
                <h2 className="heading-md text-[var(--ink)]">Inbox</h2>
                {inboxMessages.filter(m => !m.is_read).length > 0 && (
                  <span className="w-6 h-6 rounded-full bg-[var(--ruby)] text-white flex items-center justify-center micro-cap font-bold">
                    {inboxMessages.filter(m => !m.is_read).length}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto max-h-[300px] sm:max-h-[400px] hide-scrollbar divide-y divide-[var(--hairline)] p-2">
                {inboxMessages.length > 0 ? inboxMessages.map((msg, idx) => {
                  const { rawSchoolName, initials, cliffhanger } = parseMessageContent(msg);
                  return (
                    <div 
                      key={idx} 
                      onPointerDown={() => handleMessageClick(msg)}
                      className={`p-4 group cursor-pointer transition-all duration-200 min-w-0 flex gap-3 ${!msg.is_read ? 'bg-[var(--primary-subdued)]/5 hover:bg-[var(--primary-subdued)]/10' : 'hover:bg-[var(--canvas-soft)]'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${getAvatarColor(rawSchoolName)}`}>
                        <span className="font-semibold text-sm">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {!msg.is_read && <div className="w-2 h-2 rounded-full bg-[var(--primary)] shrink-0" />}
                            <span className={`body-md line-clamp-1 pr-2 truncate transition-transform duration-200 group-hover:translate-x-1 ${!msg.is_read ? 'font-semibold text-[var(--ink)]' : 'font-medium text-[var(--ink-secondary)]'}`}>
                              {rawSchoolName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="caption text-[var(--ink-mute)] shrink-0 whitespace-nowrap">
                              {getRelativeTime(msg.created_at)}
                            </span>
                            <button 
                              onPointerDown={(e) => handleDeleteMessage(e, msg.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--ruby)]/10 text-[var(--ink-mute)] hover:text-[var(--ruby)] transition-all shrink-0"
                              title="Delete Message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className={`caption line-clamp-1 transition-transform duration-200 group-hover:translate-x-1 ${!msg.is_read ? 'text-[var(--ink-secondary)] font-medium' : 'text-[var(--ink-mute)]'}`}>
                          {cliffhanger}
                        </p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-[var(--canvas-soft)] flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-[var(--ink-mute)]" />
                    </div>
                    <h3 className="body-md font-semibold text-[var(--ink)] mb-1">No messages yet</h3>
                    <p className="caption text-[var(--ink-mute)] mb-4">Your inbox is empty. Apply to schools to start receiving updates here.</p>
                    <Link href="/dashboard/search" className="button-sm bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)] px-4 py-2 rounded-pill transition-colors inline-block">
                      Find Schools
                    </Link>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[var(--hairline)] text-center">
                <button 
                  onClick={() => setIsAllMessagesOpen(true)}
                  className="button-sm text-[var(--primary)] hover:text-[var(--primary-deep)] w-full py-2 transition-colors"
                >
                  Open Messages
                </button>
              </div>
            </div>

            {/* Section Overlay */}
            {!hasMetMinimum && (
              <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
                <div className="bg-[var(--canvas)]/85 backdrop-blur-md px-5 py-4 rounded-[16px] shadow-level-1 border border-[var(--primary)]/30 flex flex-col text-center items-center gap-2 max-w-[280px]">
                  <AlertCircle className="w-6 h-6 text-[var(--primary)]" />
                  <p className="body-md font-medium text-[var(--ink)]">
                    Unlock <span className="font-bold text-[var(--ink)]">Inbox</span> by applying to <span className="font-bold text-[var(--primary)]">{remainingSlots}</span> more school{remainingSlots > 1 ? 's' : ''}.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Row 4: Placement Analytics */}
        <div className="bg-[var(--canvas)] rounded-[24px] shadow-level-1 border border-[var(--hairline)] relative overflow-hidden">
          <div className={`p-5 sm:p-8 transition-opacity duration-700 ${!hasMetMinimum ? 'opacity-30 select-none pointer-events-none blur-[4px]' : ''}`}>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h2 className="heading-md text-[var(--ink)] mb-1">Placement Analytics</h2>
                <p className="caption text-[var(--ink-mute)]">Data-driven insights from your application journey.</p>
              </div>
            </div>

            {analytics ? (
              <div className="flex flex-col gap-8">
                {/* 1. Funnel Visualizer */}
                <div>
                  <h3 className="body-md font-semibold text-[var(--ink)] mb-4">Application Funnel</h3>
                  <div className="flex w-full h-8 rounded-pill overflow-hidden bg-[var(--canvas-soft)] border border-[var(--hairline)]">
                    {analytics.total_applications > 0 ? (
                      <>
                        <div 
                          style={{ width: `${(analytics.pending_count / analytics.total_applications) * 100}%` }} 
                          className="h-full bg-[var(--ink-mute)]/20 transition-all duration-1000 group relative border-r border-[var(--canvas)]"
                          title={`Pending: ${analytics.pending_count}`}
                        />
                        <div 
                          style={{ width: `${(analytics.opened_count / analytics.total_applications) * 100}%` }} 
                          className="h-full bg-blue-500/40 transition-all duration-1000 group relative border-r border-[var(--canvas)]"
                          title={`Opened: ${analytics.opened_count}`}
                        />
                        <div 
                          style={{ width: `${(analytics.replied_count / analytics.total_applications) * 100}%` }} 
                          className="h-full bg-purple-500/40 transition-all duration-1000 group relative border-r border-[var(--canvas)]"
                          title={`Replied: ${analytics.replied_count}`}
                        />
                        <div 
                          style={{ width: `${(analytics.accepted_count / analytics.total_applications) * 100}%` }} 
                          className="h-full bg-[var(--success)] transition-all duration-1000 group relative border-r border-[var(--canvas)]"
                          title={`Accepted: ${analytics.accepted_count}`}
                        />
                        <div 
                          style={{ width: `${(analytics.rejected_count / analytics.total_applications) * 100}%` }} 
                          className="h-full bg-[var(--warning)] transition-all duration-1000 group relative"
                          title={`Rejected: ${analytics.rejected_count}`}
                        />
                      </>
                    ) : (
                      <div className="w-full h-full bg-[var(--canvas-soft)] flex items-center justify-center micro-cap text-[var(--ink-mute)]">No applications yet</div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--ink-mute)]/20" /><span className="micro-cap text-[var(--ink-mute)]">Pending ({analytics.pending_count})</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-500/40" /><span className="micro-cap text-[var(--ink-mute)]">Opened ({analytics.opened_count + analytics.replied_count + analytics.accepted_count + analytics.rejected_count})</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-purple-500/40" /><span className="micro-cap text-[var(--ink-mute)]">Replied ({analytics.replied_count})</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--success)]" /><span className="micro-cap text-[var(--ink-mute)]">Accepted ({analytics.accepted_count})</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[var(--warning)]" /><span className="micro-cap text-[var(--ink-mute)]">Rejected ({analytics.rejected_count})</span></div>
                  </div>
                </div>

                {/* 2. Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[var(--canvas-soft)] p-4 rounded-[16px] border border-[var(--hairline)] flex flex-col justify-center">
                    <span className="caption text-[var(--ink-mute)] mb-1">Acceptance Rate</span>
                    <span className={`heading-md ${analytics.acceptance_rate > 50 ? 'text-[var(--success)]' : 'text-[var(--ink)]'}`}>{analytics.acceptance_rate}%</span>
                  </div>
                  <div className="bg-[var(--canvas-soft)] p-4 rounded-[16px] border border-[var(--hairline)] flex flex-col justify-center">
                    <span className="caption text-[var(--ink-mute)] mb-1">Avg Match Score</span>
                    <span className="heading-md text-[var(--ink)]">{analytics.avg_match_score}%</span>
                  </div>
                  <div className="bg-[var(--canvas-soft)] p-4 rounded-[16px] border border-[var(--hairline)] flex flex-col justify-center col-span-2 md:col-span-1">
                    <span className="caption text-[var(--ink-mute)] mb-1">Top Targeted Region</span>
                    <span className="heading-md text-[var(--ink)] truncate">{analytics.top_region}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center bg-[var(--canvas-soft)] rounded-[16px] border border-dashed border-[var(--hairline)]">
                <AlertCircle className="w-8 h-8 text-[var(--warning)] mb-3" />
                <h3 className="body-md font-medium text-[var(--ink)] mb-1">Backend Update Required</h3>
                <p className="caption text-[var(--ink-mute)] max-w-sm text-center">
                  The Placement Analytics feature requires a new database function. Please run the provided SQL migration in your Supabase Dashboard to unlock this data.
                </p>
              </div>
            )}
          </div>

          {/* Section Overlay */}
          {!hasMetMinimum && (
            <div className="absolute inset-0 flex items-center justify-center z-10 p-4">
              <div className="bg-[var(--canvas)]/85 backdrop-blur-md px-5 py-4 rounded-[16px] shadow-level-1 border border-[var(--primary)]/30 flex flex-col text-center items-center gap-2 max-w-[280px]">
                <AlertCircle className="w-6 h-6 text-[var(--primary)]" />
                <p className="body-md font-medium text-[var(--ink)]">
                  Unlock <span className="font-bold text-[var(--ink)]">Analytics</span> by applying to <span className="font-bold text-[var(--primary)]">{remainingSlots}</span> more school{remainingSlots > 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ApplicationDetailsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        app={selectedApp} 
      />
      <InboxMessageDrawer 
        isOpen={isInboxDrawerOpen} 
        onClose={() => setIsInboxDrawerOpen(false)} 
        message={selectedApp} 
      />
      <AllMessagesDrawer
        isOpen={isAllMessagesOpen}
        onClose={() => setIsAllMessagesOpen(false)}
        messages={inboxMessages}
        onMessageClick={handleMessageClick}
        onDeleteMessage={handleDeleteMessage}
        onClearAll={handleClearAllMessages}
        getRelativeTime={getRelativeTime}
        getAvatarColor={getAvatarColor}
      />
    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense fallback={<div className="w-full h-screen flex items-center justify-center caption text-[var(--ink-mute)]">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
