'use client';

import { useEffect, useState } from 'react';
import { X, Phone, Mail, FileText, CheckCircle2, Copy, MapPin, Building, Calendar, FileCheck, FileSignature } from 'lucide-react';

export default function ApplicationDetailsDrawer({ app, onClose, isOpen }: { app: any, onClose: () => void, isOpen: boolean }) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

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

  const handleCopy = (text: string, type: 'phone' | 'email') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'phone') {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  if (!app) return null;

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
          <h2 className="heading-md text-[var(--ink)]">Application Details</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
          
          {/* Header Section */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-[16px] bg-[var(--canvas-soft)] border border-[var(--hairline)] flex items-center justify-center shrink-0 overflow-hidden">
              {app.logo_url ? (
                <img src={app.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Building className="w-6 h-6 text-[var(--ink-mute)]" />
              )}
            </div>
            <div>
              <h3 className="heading-lg text-[var(--ink)] mb-1 leading-tight">{app.school_name || app.name || 'Unknown School'}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2.5 py-1 rounded-md micro-cap flex items-center gap-1.5 border ${
                  app.status === 'ACCEPTED' ? 'bg-[var(--success)]/10 text-[var(--success)] border-transparent' :
                  app.status === 'REJECTED' ? 'bg-[var(--warning)]/10 text-[var(--warning)] border-transparent' :
                  app.status === 'OPENED' ? 'bg-blue-100 text-blue-700 border-transparent' :
                  'bg-[var(--canvas-soft)] text-[var(--ink)] border-[var(--hairline)]'
                }`}>
                  {app.status === 'ACCEPTED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {app.status || app.stage || 'PENDING'}
                </span>
                {app.match_score !== undefined && app.match_score !== null && (
                  <span className="micro-cap px-2.5 py-1 bg-[var(--canvas-soft)] text-[var(--ink)] border border-[var(--hairline)] rounded-md">
                    {app.match_score}% Match
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <section className="space-y-4">
            <h4 className="body-md font-semibold text-[var(--ink)]">School Contact</h4>
            
            <div className="bg-[var(--canvas-soft)] border border-[var(--hairline)] rounded-xl overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-[var(--hairline)] bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="caption text-[var(--ink-mute)]">Phone Number</p>
                    <a href={`tel:${app.contact_phone || 'N/A'}`} className="body-md font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors">
                      {app.contact_phone || 'N/A'}
                    </a>
                  </div>
                </div>
                {app.contact_phone && (
                  <button 
                    onClick={() => handleCopy(app.contact_phone, 'phone')}
                    className="p-2 text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] rounded-md transition-colors relative"
                  >
                    {copiedPhone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>

              <div className="p-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="caption text-[var(--ink-mute)]">Email Address</p>
                    <a href={`mailto:${app.contact_email || 'N/A'}`} className="body-md font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors truncate block">
                      {app.contact_email || 'N/A'}
                    </a>
                  </div>
                </div>
                {app.contact_email && (
                  <button 
                    onClick={() => handleCopy(app.contact_email, 'email')}
                    className="p-2 text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] rounded-md transition-colors relative"
                  >
                    {copiedEmail ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Details Section */}
          <section className="space-y-4">
            <h4 className="body-md font-semibold text-[var(--ink)]">Application Metadata</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[var(--ink-mute)]">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="body-sm">{app.town || app.town_city || 'Unknown Town'}, {app.region || app.regions?.name} {app.distance_km ? `(${app.distance_km.toFixed(1)}km)` : ''}</span>
              </div>
              <div className="flex items-center gap-3 text-[var(--ink-mute)]">
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="body-sm">Submitted on {new Date(app.created_at || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </section>

          {/* Attached Documents Section */}
          <section className="space-y-4">
            <h4 className="body-md font-semibold text-[var(--ink)]">Documents Included</h4>
            
            <div className="space-y-2">
              <div className="p-3 border border-[var(--hairline)] rounded-lg flex items-center gap-3 bg-[var(--canvas-soft)]">
                <div className="w-8 h-8 rounded-md bg-white border border-[var(--hairline)] flex items-center justify-center shrink-0">
                  <FileSignature className="w-4 h-4 text-[var(--ink-mute)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="body-sm font-medium text-[var(--ink)] truncate">Placement Letter</p>
                  <p className="micro text-[var(--ink-mute)]">AI Generated</p>
                </div>
              </div>
              
              {app.documents_attached?.map((doc: string, idx: number) => (
                <div key={idx} className="p-3 border border-[var(--hairline)] rounded-lg flex items-center gap-3 bg-[var(--canvas-soft)]">
                  <div className="w-8 h-8 rounded-md bg-white border border-[var(--hairline)] flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4 text-[var(--ink-mute)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="body-sm font-medium text-[var(--ink)] truncate">{doc.split('/').pop() || 'Document'}</p>
                  </div>
                </div>
              ))}

              {(!app.documents_attached || app.documents_attached.length === 0) && (
                <p className="body-sm text-[var(--ink-mute)] italic">No additional documents attached.</p>
              )}
            </div>
          </section>

        </div>
        
        <div className="p-6 border-t border-[var(--hairline)] bg-white">
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl border border-[var(--hairline)] bg-white hover:bg-[var(--canvas-soft)] transition-colors font-semibold text-[var(--ink)]"
          >
            Close Details
          </button>
        </div>
      </div>
    </>
  );
}
