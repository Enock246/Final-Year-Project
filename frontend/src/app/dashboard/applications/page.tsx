'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ApplicationDetailsDrawer from '../components/ApplicationDetailsDrawer';

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<'Active' | 'Past'>('Active');
  const [applications, setApplications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchApps() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.rpc('get_active_applications_with_scores', { student_uuid: user.id });
        if (data) {
          setApplications(data);
        }
      }
      setIsLoading(false);
    }
    fetchApps();
  }, []);

  // According to user preferences, Active = PENDING. Past = ACCEPTED | REJECTED.
  // We'll also bundle OPENED and DELIVERED into Active just in case email webhooks trigger them.
  const activeApps = applications.filter(app => ['PENDING', 'OPENED'].includes(app.status));
  const pastApps = applications.filter(app => ['REPLIED', 'ACCEPTED', 'REJECTED'].includes(app.status));
  
  const displayApps = filter === 'Active' ? activeApps : pastApps;

  return (
    <div className="w-full animate-in fade-in duration-500 max-w-[1000px] mx-auto">
      
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-10 gap-6">
        <div>
          <h1 className="display-lg text-[var(--ink)] mb-3">Applications</h1>
          <p className="body-lg text-[var(--ink-mute)]">Track your placement requests.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Segmented Control */}
          <div className="flex bg-[var(--canvas-soft)] border border-[var(--hairline)] rounded-xl p-1 w-full sm:w-auto">
            <button 
              onClick={() => setFilter('Active')}
              className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-[14px] font-medium transition-all ${filter === 'Active' ? 'bg-white text-[var(--ink)] shadow-sm border border-[var(--hairline)]' : 'text-[var(--ink-mute)] hover:bg-[var(--hairline)] border border-transparent'}`}
            >
              Active
            </button>
            <button 
              onClick={() => setFilter('Past')}
              className={`flex-1 sm:flex-none px-8 py-2.5 rounded-lg text-[14px] font-medium transition-all ${filter === 'Past' ? 'bg-white text-[var(--ink)] shadow-sm border border-[var(--hairline)]' : 'text-[var(--ink-mute)] hover:bg-[var(--hairline)] border border-transparent'}`}
            >
              Past
            </button>
          </div>
          
          <Link 
            href="/dashboard/find" 
            className="flex items-center justify-center w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white text-[14px] font-semibold shadow-sm hover:bg-[var(--primary-deep)] transition-all"
          >
            New Application
          </Link>
        </div>
      </div>


      {/* List View */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="body-md text-[var(--ink-mute)]">Loading applications...</p>
          </div>
        ) : (
          <>
            {displayApps.map((app) => (
              <div 
                key={app.application_id}
                onClick={() => { setSelectedApp(app); setIsDrawerOpen(true); }}
                className="bg-white rounded-[24px] border border-[var(--hairline)] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-level-2 hover:border-transparent transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[16px] bg-[var(--canvas-soft)] border border-[var(--hairline)] text-[var(--ink)] flex items-center justify-center shrink-0 overflow-hidden">
                    {app.logo_url ? (
                      <img src={app.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <Building className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="heading-md text-[var(--ink)] mb-1">{app.school_name || 'Unknown School'}</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[var(--ink-mute)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="caption">Sent {new Date(app.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 sm:flex-col sm:items-end justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-md micro-cap flex items-center gap-1.5 border ${
                      app.status === 'ACCEPTED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-transparent' :
                      app.status === 'REJECTED' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-transparent' :
                      app.status === 'OPENED' ? 'bg-blue-100 text-blue-700 border-transparent' :
                      'bg-[var(--canvas-soft)] text-[var(--ink)] border-[var(--hairline)]'
                    }`}>
                      {app.status === 'ACCEPTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {app.status || 'PENDING'}
                    </span>
                  </div>
                  <button className="text-[var(--primary)] text-[14px] font-medium hover:text-[var(--primary-deep)] transition-colors">
                    View Details &rarr;
                  </button>
                </div>
              </div>
            ))}

            {displayApps.length === 0 && (
              <div className="py-24 text-center bg-white rounded-[24px] border border-[var(--hairline)] border-dashed">
                <div className="w-16 h-16 bg-[var(--canvas-soft)] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Building className="w-8 h-8 text-[var(--ink-mute)]" />
                </div>
                <p className="heading-md text-[var(--ink)] mb-2">No {filter.toLowerCase()} applications</p>
                <p className="body-md text-[var(--ink-mute)]">When you apply to schools, they will appear here.</p>
              </div>
            )}
          </>
        )}
      </div>

      <ApplicationDetailsDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        app={selectedApp} 
      />
    </div>
  );
}
