'use client';

import { useEffect } from 'react';
import { X, MessageSquare, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { parseMessageContent } from '../page';

export default function AllMessagesDrawer({ 
  isOpen, 
  onClose, 
  messages, 
  onMessageClick,
  onDeleteMessage,
  onClearAll,
  getRelativeTime,
  getAvatarColor
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  messages: any[], 
  onMessageClick: (msg: any) => void,
  onDeleteMessage: (e: React.MouseEvent | React.PointerEvent, id: string) => void,
  onClearAll: () => void,
  getRelativeTime: (dateString: string) => string,
  getAvatarColor: (name: string) => string
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-ink/20 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-md bg-[var(--canvas)] shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[var(--hairline)] bg-[var(--canvas)]">
          <div className="flex items-center gap-3">
            <h2 className="heading-md text-[var(--ink)]">All Messages</h2>
            {messages.length > 0 && (
              <span className="w-6 h-6 rounded-full bg-[var(--canvas-soft)] text-[var(--ink-secondary)] flex items-center justify-center micro-cap font-bold">
                {messages.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-sm font-medium text-[var(--ruby)] hover:text-[var(--ruby-deep)] px-3 py-1.5 rounded-lg hover:bg-[var(--ruby)]/10 transition-colors"
              >
                Clear All
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar divide-y divide-[var(--hairline)]">
          {messages.length > 0 ? messages.map((msg, idx) => {
            const { rawSchoolName, initials, cliffhanger } = parseMessageContent(msg);
            
            return (
              <div 
                key={idx} 
                onPointerDown={() => { onMessageClick(msg); }}
                className={`p-6 group cursor-pointer transition-all duration-200 flex gap-4 ${!msg.is_read ? 'bg-[var(--primary-subdued)]/5 hover:bg-[var(--primary-subdued)]/10' : 'hover:bg-[var(--canvas-soft)]'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${getAvatarColor(rawSchoolName)}`}>
                  <span className="font-bold text-lg">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!msg.is_read && <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] shrink-0" />}
                      <span className={`body-md line-clamp-1 pr-2 truncate transition-transform duration-200 group-hover:translate-x-1 ${!msg.is_read ? 'font-bold text-[var(--ink)]' : 'font-medium text-[var(--ink-secondary)]'}`}>
                        {rawSchoolName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="caption text-[var(--ink-mute)] shrink-0 whitespace-nowrap">
                        {getRelativeTime(msg.created_at)}
                      </span>
                      <button 
                        onPointerDown={(e) => onDeleteMessage(e, msg.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-[var(--ruby)]/10 text-[var(--ink-mute)] hover:text-[var(--ruby)] transition-all shrink-0"
                        title="Delete Message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className={`caption line-clamp-2 mt-1 transition-transform duration-200 group-hover:translate-x-1 ${!msg.is_read ? 'text-[var(--ink-secondary)] font-medium' : 'text-[var(--ink-mute)]'}`}>
                    {cliffhanger}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 py-20">
              <div className="w-20 h-20 rounded-full bg-[var(--canvas-soft)] flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-[var(--ink-mute)]" />
              </div>
              <h3 className="heading-sm text-[var(--ink)] mb-2">You're all caught up!</h3>
              <p className="body-md text-[var(--ink-mute)] mb-6 max-w-xs">There are no messages in your inbox. Check back later for updates.</p>
              <Link href="/dashboard/search" onClick={onClose} className="button bg-[var(--primary)] text-white hover:bg-[var(--primary-deep)] px-6 py-3 rounded-pill transition-colors inline-block font-semibold shadow-sm">
                Find More Schools
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
