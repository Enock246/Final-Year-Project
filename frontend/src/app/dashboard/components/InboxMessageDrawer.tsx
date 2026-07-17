'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, User } from 'lucide-react';
import { parseMessageContent } from '../page';
import { createClient } from '@/utils/supabase/client';

export default function InboxMessageDrawer({ message, onClose, isOpen }: { message: any, onClose: () => void, isOpen: boolean }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [appStatus, setAppStatus] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (message?.application_id) {
        const fetchStatus = async () => {
          const supabase = createClient();
          const { data } = await supabase.from('applications').select('status').eq('id', message.application_id).single();
          if (data) setAppStatus(data.status);
        };
        fetchStatus();
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, message]);

  if (!message) return null;

  const { heading, body } = parseMessageContent(message);


  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-ink/20 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--hairline)] bg-white">
          <h2 className="heading-md text-[var(--ink)] truncate pr-4">{heading}</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-[var(--ink-mute)] mb-6 border-b border-[var(--hairline)] pb-4">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="body-sm">{new Date(message.created_at).toLocaleString()}</span>
            </div>
            
            <div className="prose prose-sm max-w-none text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {body}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-[var(--hairline)] bg-white space-y-3">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-[var(--hairline)] bg-white hover:bg-[var(--canvas-soft)] transition-colors font-semibold text-[var(--ink)] text-[14px]"
          >
            Close Message
          </button>
        </div>
      </div>
    </>
  );
}
