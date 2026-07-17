'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, HelpCircle, Settings, Bell, Menu, X, Home, Search, FileText, User, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';

const tabs = [
  { name: 'Overview', href: '/dashboard', icon: Home },
  { name: 'Find Schools', href: '/dashboard/find', icon: Search },
  { name: 'Applications', href: '/dashboard/applications', icon: FileText },
  { name: 'Profile & Settings', href: '/dashboard/settings', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<{name: string, email: string, initial: string} | null>(null);

  useEffect(() => {
    setMounted(true);

    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: student } = await supabase.from('students').select('full_name').eq('id', user.id).single();
        const name = student?.full_name || 'Student';
        setUserProfile({
          name: name,
          email: user.email || '',
          initial: name.charAt(0).toUpperCase()
        });
      }
    }
    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-64';

  return (
    <div className="min-h-screen bg-canvas-soft-2 font-sans flex relative overflow-x-hidden">
      
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-canvas border-b border-hairline px-4 flex items-center justify-between z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--ink)] flex items-center justify-center text-white shrink-0 shadow-sm">
            <MapPin className="w-4 h-4" />
          </div>
          <span className="text-[15px] font-semibold text-ink">
            InternAid
          </span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-ink-mute hover:bg-canvas-soft rounded-full transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 ${sidebarWidth} bg-canvas border-r border-hairline z-50 flex flex-col transform transition-all duration-300 ease-in-out md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full'}`}>
        
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center border-b border-hairline ${isCollapsed && !mobileMenuOpen ? 'justify-center px-0' : 'justify-between px-6'}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--ink)] flex items-center justify-center text-white shrink-0 shadow-sm">
              <MapPin className="w-4 h-4" />
            </div>
            {(!isCollapsed || mobileMenuOpen) && (
              <span className="text-[15px] font-semibold text-ink tracking-tight animate-in fade-in">
                InternAid
              </span>
            )}
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden w-8 h-8 flex items-center justify-center text-ink-mute hover:bg-canvas-soft rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
            const Icon = tab.icon;
            
            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={() => setMobileMenuOpen(false)}
                title={isCollapsed && !mobileMenuOpen ? tab.name : undefined}
                className={`flex items-center gap-3 py-2.5 rounded-md transition-colors ${isCollapsed && !mobileMenuOpen ? 'px-0 justify-center' : 'px-3'} ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-[450]' 
                    : 'text-ink-mute hover:bg-black/5 hover:text-primary font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary' : 'text-ink-mute'}`} />
                {(!isCollapsed || mobileMenuOpen) && (
                  <span className="text-[14px] whitespace-nowrap animate-in fade-in">{tab.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (User Profile & Toggles) */}
        <div className="border-t border-hairline p-4 flex flex-col gap-2">
          
          <div className={`flex items-center ${isCollapsed && !mobileMenuOpen ? 'justify-center' : 'justify-between'} px-2 py-2 group cursor-pointer rounded-md hover:bg-canvas-soft transition-colors`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-primary-subdued flex items-center justify-center text-primary-deep text-sm font-semibold shrink-0">
                {userProfile ? userProfile.initial : 'S'}
              </div>
              {(!isCollapsed || mobileMenuOpen) && (
                <div className="min-w-0 animate-in fade-in">
                  <p className="body-md font-semibold text-ink truncate">
                    {userProfile ? userProfile.name : 'Loading...'}
                  </p>
                  <p className="micro text-ink-mute truncate">
                    {userProfile ? userProfile.email : ''}
                  </p>
                </div>
              )}
            </div>
            {(!isCollapsed || mobileMenuOpen) && (
              <Settings className="w-4 h-4 text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            )}
          </div>

          <div className={`flex items-center ${isCollapsed && !mobileMenuOpen ? 'flex-col gap-2' : 'justify-between gap-2 mt-2'}`}>
            <button 
              onClick={handleSignOut}
              title={isCollapsed && !mobileMenuOpen ? "Sign out" : undefined}
              className={`flex items-center gap-3 rounded-md text-ink-mute hover:text-ruby hover:bg-ruby/5 transition-colors font-medium text-[14px] h-10 ${isCollapsed && !mobileMenuOpen ? 'w-10 justify-center' : 'flex-1 px-3'}`}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {(!isCollapsed || mobileMenuOpen) && <span className="animate-in fade-in whitespace-nowrap">Sign out</span>}
            </button>
          </div>
          
          {/* Collapse Toggle (Desktop only) */}
          <div className="hidden md:flex justify-end mt-2 pt-2 border-t border-hairline">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-8 h-8 rounded-full hover:bg-canvas-soft flex items-center justify-center text-ink-mute transition-colors mx-auto"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen min-w-0 pt-16 md:pt-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-[72px]' : 'md:ml-64'}`}>
        
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-16 border-b border-hairline bg-canvas/80 backdrop-blur-md items-center justify-end px-8 sticky top-0 z-30">
          <button className="w-10 h-10 rounded-full hover:bg-canvas-soft flex items-center justify-center text-ink-mute transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-ruby border-2 border-canvas"></span>
          </button>
        </header>

        <div className="p-4 md:p-8 flex-1 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
