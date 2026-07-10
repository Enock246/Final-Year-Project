'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, FileText, Settings as SettingsIcon, Shield, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import ProfileTab from './components/ProfileTab';
import DocumentsTab from './components/DocumentsTab';
import PreferencesTab from './components/PreferencesTab';
import AccountTab from './components/AccountTab';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase
          .from('student_profiles')
          .select('*, students(full_name, email)')
          .eq('student_id', user.id)
          .single();
          
        if (data) {
          setProfileData({
            ...data,
            full_name: data.students?.full_name || '',
            email: data.students?.email || user.email,
          });
        } else {
          // Fallback if no profile exists
          setProfileData({
            full_name: user.user_metadata?.full_name || '',
            email: user.email || '',
          });
        }
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'account', label: 'Account', icon: Shield },
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-ink-mute" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-8 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-[14px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-[450]'
                  : 'text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] font-medium'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[var(--primary)]' : 'text-ink-mute'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-canvas p-6 md:p-8 rounded-2xl shadow-none border border-hairline"
        >
          {activeTab === 'profile' && <ProfileTab initialData={profileData} />}
          {activeTab === 'documents' && <DocumentsTab initialData={profileData} />}
          {activeTab === 'preferences' && <PreferencesTab initialData={profileData} />}
          {activeTab === 'account' && <AccountTab />}
        </motion.div>
      </main>
    </div>
  );
}
