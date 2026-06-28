'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { X, CheckCircle2, ChevronRight, Loader2, Send, Edit3, FileText, ArrowLeft, Mail } from 'lucide-react';
import Link from 'next/link';

interface ApplicationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: any;
}

export default function ApplicationWizardModal({ isOpen, onClose, school }: ApplicationWizardModalProps) {
  const [step, setStep] = useState(1);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  
  // AI Generation State
  const [generating, setGenerating] = useState(false);
  const [genChecklist, setGenChecklist] = useState<boolean[]>([false, false, false, false, false]);
  const [letterContent, setLetterContent] = useState('');
  
  const [sending, setSending] = useState(false);
  const [sendChecklist, setSendChecklist] = useState<boolean[]>([false, false, false, false]);
  const [sent, setSent] = useState(false);

  // Inline Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [placementFile, setPlacementFile] = useState<File | null>(null);

  const supabase = createClient();

  const formatFileName = (path: string | undefined) => {
    if (!path) return '';
    const fullName = path.split('/').pop() || '';
    const parts = fullName.split('_');
    if (parts.length >= 3) {
      return parts.slice(2).join('_');
    }
    return fullName;
  };

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSent(false);
      setLetterContent('');
      setGenChecklist([false, false, false, false, false]);
      setSendChecklist([false, false, false, false]);
      setCvFile(null);
      setTranscriptFile(null);
      setPlacementFile(null);
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('student_profiles')
          .select(`
            *,
            students ( full_name, email )
          `)
          .eq('student_id', user.id)
          .single();
        
        if (!error && profile) {
          setStudentProfile(profile);
        } else {
          console.error("Profile fetch error:", error);
          // Fallback if no profile is found, just use the user object
          setStudentProfile({
            fetchError: error?.message || 'Unknown error',
            students: {
              full_name: user.user_metadata?.full_name || 'Student',
              email: user.email || ''
            }
          });
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
    setLoadingProfile(false);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('students')
          .update({ full_name: editFullName })
          .eq('id', user.id);
          
        if (!error) {
          setStudentProfile((prev: any) => ({
            ...prev,
            students: { ...prev?.students, full_name: editFullName }
          }));
          setIsEditingProfile(false);
        } else {
          console.error("Failed to update profile", error);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setSavingProfile(false);
  };

  const handleSaveDocs = async () => {
    setUploadingDocs(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const paths: Record<string, string> = {};
      const uploads = [
        { file: cvFile, type: 'cv' },
        { file: transcriptFile, type: 'transcript' },
        { file: placementFile, type: 'placement' }
      ];

      for (const upload of uploads) {
        if (upload.file) {
          const fileExt = upload.file.name.split('.').pop();
          const safeOriginalName = upload.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `${user.id}/${upload.type}_${Date.now()}_${safeOriginalName}`;
          
          const { data, error } = await supabase.storage
            .from('documents')
            .upload(fileName, upload.file);
            
          if (error) throw error;
          if (data) {
            if (upload.type === 'placement') {
              paths['placement_letter_path'] = data.path;
            } else {
              paths[`${upload.type}_file_path`] = data.path;
            }
          }
        }
      }

      if (Object.keys(paths).length > 0) {
        const { error } = await supabase
          .from('student_profiles')
          .upsert({ 
            student_id: user.id,
            ...paths,
            updated_at: new Date().toISOString()
          }, { onConflict: 'student_id' });
          
        if (error) throw error;
        
        // Update local state so UI refreshes
        setStudentProfile((prev: any) => ({
          ...prev,
          ...paths
        }));
      }
      
      setIsEditingDocs(false);
    } catch (err) {
      console.error("Error uploading documents", err);
      alert("Failed to upload documents. Please try again.");
    }
    setUploadingDocs(false);
  };

  const startAIGeneration = async () => {
    setStep(2);
    setGenerating(true);
    
    // Simulate checklist progress
    const timings = [500, 1500, 2500, 3500, 4500];
    timings.forEach((time, index) => {
      setTimeout(() => {
        setGenChecklist(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, time);
    });

    try {
      const res = await fetch('/api/generate-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentProfile: {
            full_name: studentProfile?.students?.full_name || 'Student',
            key_skills_and_offerings: studentProfile?.key_skills_and_offerings || [],
          },
          schoolDetails: {
            name: school.name,
            school_type: school.school_type,
            town_city: school.town_city,
          }
        })
      });
      
      const data = await res.json();
      
      // Wait at least until the last checklist item finishes before showing the letter
      setTimeout(() => {
        setLetterContent(data.letter || 'Failed to generate letter.');
        setGenerating(false);
      }, 5000);
      
    } catch (err) {
      console.error(err);
      setTimeout(() => {
        setLetterContent('Error generating letter. Please write your own or try again.');
        setGenerating(false);
      }, 5000);
    }
  };

  const sendApplication = async () => {
    setSending(true);
    setSendChecklist([false, false, false, false]);
    
    // Simulate email sending steps to give user feedback
    const timings = [800, 1600, 2400];
    timings.forEach((time, index) => {
      setTimeout(() => {
        setSendChecklist(prev => {
          const next = [...prev];
          next[index] = true;
          return next;
        });
      }, time);
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const attachedDocs = [];
      if (studentProfile?.cv_file_path) attachedDocs.push({ name: 'CV / Resume', path: studentProfile.cv_file_path });
      if (studentProfile?.transcript_file_path) attachedDocs.push({ name: 'Academic Transcript', path: studentProfile.transcript_file_path });
      if (studentProfile?.placement_letter_path) attachedDocs.push({ name: 'Placement Letter', path: studentProfile.placement_letter_path });

      await fetch('/api/send-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user?.id,
          school_id: school.id,
          student_email: studentProfile?.students?.email,
          student_name: studentProfile?.students?.full_name || 'A student',
          school_email: school.contact_email,
          school_name: school.name,
          letter_content: letterContent,
          documents: attachedDocs,
        })
      });
      
      setSendChecklist(prev => {
        const next = [...prev];
        next[3] = true;
        return next;
      });
      
      setTimeout(() => {
        setSent(true);
        setSending(false);
      }, 1000);
      
    } catch (err) {
      console.error(err);
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={step === 1 ? onClose : undefined} 
      />
      
      <div className="relative w-full max-w-[800px] max-h-[90vh] bg-white rounded-[24px] sm:rounded-[32px] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--hairline)] shrink-0 bg-white">
          <div className="flex items-center gap-4">
            {step > 1 && !sent && !generating && (
              <button 
                onClick={() => setStep(step - 1)}
                className="p-2 -ml-2 rounded-full hover:bg-[var(--canvas-soft)] text-[var(--ink-mute)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="heading-md text-[var(--ink)]">
                {step === 1 ? 'Review Your Profile' : 
                 step === 2 ? (generating ? 'AI Generation' : 'Review Letter') : 
                 sent ? 'Application Sent' : 'Ready to Send?'}
              </h2>
              <p className="text-[13px] text-[var(--ink-mute)] mt-0.5">
                Applying to <span className="font-medium text-[var(--ink)]">{school?.name}</span>
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--canvas-soft)] hover:bg-[var(--hairline)] text-[var(--ink)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--canvas)]">
          
          {/* STEP 1: REVIEW PROFILE */}
          {step === 1 && (
            <div className="max-w-[600px] mx-auto space-y-8 py-4">
              {loadingProfile ? (
                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
              ) : (
                <>
                  <div className="bg-white border border-[var(--hairline)] rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-[16px] font-bold text-[var(--ink)]">Profile Summary</h3>
                      {!isEditingProfile && (
                        <button 
                          onClick={() => {
                            setEditFullName(studentProfile?.students?.full_name || '');
                            setIsEditingProfile(true);
                          }}
                          className="text-[14px] text-[var(--primary)] font-semibold hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      )}
                    </div>
                    
                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[13px] text-[var(--ink-mute)] mb-1">Full Name</label>
                          <input 
                            type="text" 
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full bg-[var(--canvas-soft)] border border-[var(--hairline)] rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] text-[var(--ink-mute)] mb-1">Email <span className="text-[11px] ml-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">(Read-only)</span></label>
                          <input 
                            type="text" 
                            value={studentProfile?.students?.email || ''}
                            readOnly
                            className="w-full bg-[var(--canvas)] border border-[var(--hairline)] rounded-xl px-4 py-2.5 text-[15px] text-[var(--ink-mute)] opacity-70 cursor-not-allowed"
                          />
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            onClick={handleSaveProfile}
                            disabled={savingProfile || !editFullName.trim()}
                            className="px-6 py-2 bg-[var(--primary)] text-white text-[14px] font-medium rounded-lg flex items-center gap-2 hover:bg-[var(--primary-deep)] disabled:opacity-50 transition-colors"
                          >
                            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                          </button>
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            disabled={savingProfile}
                            className="px-6 py-2 bg-transparent text-[var(--ink-mute)] text-[14px] font-medium hover:text-[var(--ink)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 border-b border-[var(--hairline)] pb-4">
                          <span className="text-[14px] text-[var(--ink-mute)]">Full Name</span>
                          <span className="col-span-2 text-[14px] font-medium text-[var(--ink)]">{studentProfile?.students?.full_name || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-3 border-b border-[var(--hairline)] pb-4">
                          <span className="text-[14px] text-[var(--ink-mute)]">Email</span>
                          <span className="col-span-2 text-[14px] font-medium text-[var(--ink)]">{studentProfile?.students?.email || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-3 border-b border-[var(--hairline)] pb-4">
                          <span className="text-[14px] text-[var(--ink-mute)]">Location</span>
                          <span className="col-span-2 text-[14px] font-medium text-[var(--ink)]">{studentProfile?.town_city || 'N/A'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="text-[14px] text-[var(--ink-mute)]">Key Skills</span>
                          <span className="col-span-2 text-[14px] font-medium text-[var(--ink)]">
                            {studentProfile?.key_skills_and_offerings?.join(', ') || 'None listed'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-[var(--hairline)] rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-[16px] font-bold text-[var(--ink)]">Attached Documents</h3>
                      {!isEditingDocs && (
                        <button 
                          onClick={() => {
                            setCvFile(null);
                            setTranscriptFile(null);
                            setPlacementFile(null);
                            setIsEditingDocs(true);
                          }}
                          className="text-[14px] text-[var(--primary)] font-semibold hover:underline flex items-center gap-1"
                        >
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                      )}
                    </div>
                    
                    {isEditingDocs ? (
                      <div className="space-y-4">
                        <div className="bg-blue-50 text-blue-800 text-[13px] p-3 rounded-lg border border-blue-100">
                          <span className="font-semibold">Note:</span> Your currently attached documents are safely stored in the cloud. You only need to upload files here if you want to <strong>replace</strong> them.
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-4 border border-[var(--hairline)] rounded-xl bg-[var(--canvas-soft)]">
                            <label className="block text-[14px] font-medium text-[var(--ink)] mb-2">CV / Resume</label>
                            <input type="file" onChange={(e) => setCvFile(e.target.files?.[0] || null)} className="w-full text-[13px] text-[var(--ink-mute)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:bg-[var(--primary-deep)]" accept=".pdf,.doc,.docx" />
                          </div>
                          <div className="p-4 border border-[var(--hairline)] rounded-xl bg-[var(--canvas-soft)]">
                            <label className="block text-[14px] font-medium text-[var(--ink)] mb-2">Academic Transcript</label>
                            <input type="file" onChange={(e) => setTranscriptFile(e.target.files?.[0] || null)} className="w-full text-[13px] text-[var(--ink-mute)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:bg-[var(--primary-deep)]" accept=".pdf,.doc,.docx" />
                          </div>
                          <div className="p-4 border border-[var(--hairline)] rounded-xl bg-[var(--canvas-soft)]">
                            <label className="block text-[14px] font-medium text-[var(--ink)] mb-2">Placement Letter (Optional)</label>
                            <input type="file" onChange={(e) => setPlacementFile(e.target.files?.[0] || null)} className="w-full text-[13px] text-[var(--ink-mute)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[var(--primary)] file:text-white hover:file:bg-[var(--primary-deep)]" accept=".pdf,.doc,.docx" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                          <button 
                            onClick={handleSaveDocs}
                            disabled={uploadingDocs || (!cvFile && !transcriptFile && !placementFile)}
                            className="px-6 py-2 bg-[var(--primary)] text-white text-[14px] font-medium rounded-lg flex items-center gap-2 hover:bg-[var(--primary-deep)] disabled:opacity-50 transition-colors"
                          >
                            {uploadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload & Save'}
                          </button>
                          <button 
                            onClick={() => setIsEditingDocs(false)}
                            disabled={uploadingDocs}
                            className="px-6 py-2 bg-transparent text-[var(--ink-mute)] text-[14px] font-medium hover:text-[var(--ink)] transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {(!studentProfile?.cv_file_path || !studentProfile?.transcript_file_path) && (
                          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                            <FileText className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[13px] font-medium text-orange-800">Missing Documents</p>
                              <p className="text-[12px] text-orange-600 mt-0.5">You haven't uploaded all required documents yet. We highly recommend adding your CV and Transcript before applying.</p>
                            </div>
                          </div>
                        )}
                        
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${studentProfile?.cv_file_path ? 'bg-[var(--canvas-soft)] border-[var(--hairline)]' : 'bg-white border-dashed border-gray-300'}`}>
                          <FileText className={`w-5 h-5 ${studentProfile?.cv_file_path ? 'text-[var(--primary)]' : 'text-gray-400'}`} />
                          <div className="flex flex-col">
                            <span className={`text-[14px] font-medium ${studentProfile?.cv_file_path ? 'text-[var(--ink)]' : 'text-gray-500'}`}>CV / Resume</span>
                            {studentProfile?.cv_file_path && <span className="text-[12px] text-gray-500 truncate max-w-[200px]">{formatFileName(studentProfile.cv_file_path)}</span>}
                          </div>
                          {studentProfile?.cv_file_path ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" /> : <span className="text-[12px] text-gray-400 ml-auto font-medium tracking-wide uppercase shrink-0">Missing</span>}
                        </div>
                        <div className={`flex items-center gap-3 p-3 rounded-xl border ${studentProfile?.transcript_file_path ? 'bg-[var(--canvas-soft)] border-[var(--hairline)]' : 'bg-white border-dashed border-gray-300'}`}>
                          <FileText className={`w-5 h-5 ${studentProfile?.transcript_file_path ? 'text-[var(--primary)]' : 'text-gray-400'}`} />
                          <div className="flex flex-col">
                            <span className={`text-[14px] font-medium ${studentProfile?.transcript_file_path ? 'text-[var(--ink)]' : 'text-gray-500'}`}>Academic Transcript</span>
                            {studentProfile?.transcript_file_path && <span className="text-[12px] text-gray-500 truncate max-w-[200px]">{formatFileName(studentProfile.transcript_file_path)}</span>}
                          </div>
                          {studentProfile?.transcript_file_path ? <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" /> : <span className="text-[12px] text-gray-400 ml-auto font-medium tracking-wide uppercase shrink-0">Missing</span>}
                        </div>
                        {studentProfile?.placement_letter_path && (
                          <div className="flex items-center gap-3 p-3 rounded-xl border bg-[var(--canvas-soft)] border-[var(--hairline)]">
                            <FileText className="w-5 h-5 text-[var(--primary)]" />
                            <div className="flex flex-col">
                              <span className="text-[14px] font-medium text-[var(--ink)]">Placement Letter</span>
                              <span className="text-[12px] text-gray-500 truncate max-w-[200px]">{formatFileName(studentProfile.placement_letter_path)}</span>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: AI GENERATION */}
          {step === 2 && (
            <div className="max-w-[700px] mx-auto py-4">
              {generating ? (
                <div className="bg-white border border-[var(--hairline)] rounded-2xl p-8 shadow-sm text-center">
                  <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h3 className="heading-md text-[var(--ink)] mb-8">Drafting your perfect application...</h3>
                  
                  <div className="space-y-4 max-w-[300px] mx-auto text-left">
                    {[
                      'Analyzing school requirements',
                      'Reviewing successful applications',
                      'Incorporating insider tips',
                      'Personalizing for your profile',
                      'Formatting professionally'
                    ].map((text, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {genChecklist[i] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 animate-in zoom-in" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[var(--hairline)] shrink-0" />
                        )}
                        <span className={`text-[15px] font-medium transition-colors ${genChecklist[i] ? 'text-[var(--ink)]' : 'text-[var(--ink-mute)]'}`}>
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  {genChecklist[4] && (
                    <p className="mt-8 text-[14px] font-bold text-[var(--primary)] animate-pulse">Almost done...</p>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-[var(--hairline)] rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                  <div className="p-4 border-b border-[var(--hairline)] bg-[var(--canvas-soft)] flex justify-between items-center">
                    <span className="text-[13px] font-semibold text-[var(--ink-mute)] uppercase tracking-wider">Application Letter</span>
                    <span className="text-[12px] bg-[var(--primary-light)] text-[var(--primary-deep)] px-2 py-1 rounded font-medium">AI Generated</span>
                  </div>
                  <textarea 
                    value={letterContent}
                    onChange={(e) => setLetterContent(e.target.value)}
                    className="flex-1 w-full p-6 text-[15px] leading-relaxed text-[var(--ink)] resize-none outline-none focus:ring-inset focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="Write your letter here..."
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: SEND CONFIRMATION */}
          {step === 3 && (
            <div className="max-w-[500px] mx-auto py-8">
              {sent ? (
                <div className="bg-white border border-[var(--hairline)] rounded-2xl p-10 shadow-sm text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="heading-lg text-[var(--ink)] mb-2">WHAT&apos;S NEXT?</h3>
                  <p className="text-[15px] text-[var(--ink-mute)] mb-6 max-w-sm mx-auto">
                    Your application is officially en route to {school.name}.
                  </p>
                  
                  <div className="bg-[var(--canvas-soft)] rounded-xl p-6 text-left border border-[var(--hairline)] mb-8 space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[var(--ink)] mb-1">We&apos;ll notify you when they open your email</h4>
                        <p className="text-[13px] text-[var(--ink-mute)]">Track it live from your dashboard.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                        <Loader2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[var(--ink)] mb-1">Expected response: Within 5-7 days</h4>
                        <p className="text-[13px] text-[var(--ink-mute)]">Schools take time to review documents.</p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-[var(--ink)] mb-1">We&apos;ll remind you to follow up if needed</h4>
                        <p className="text-[13px] text-[var(--ink-mute)]">If they don&apos;t reply, we&apos;ll prompt you to send a follow-up.</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-[var(--primary)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--primary-deep)] transition-all"
                  >
                    Back to Dashboard
                  </button>
                </div>
              ) : sending ? (
                <div className="bg-white border border-[var(--hairline)] rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <h3 className="heading-md text-[var(--ink)] mb-8">Sending your application...</h3>
                  
                  <div className="space-y-4 max-w-[300px] mx-auto text-left">
                    {[
                      `Email delivered to ${school.name}`,
                      'Copy sent to your email',
                      'Documents attached successfully',
                      'Tracking activated'
                    ].map((text, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {sendChecklist[i] ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 animate-in zoom-in" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-[var(--hairline)] shrink-0" />
                        )}
                        <span className={`text-[15px] font-medium transition-colors ${sendChecklist[i] ? 'text-[var(--ink)]' : 'text-[var(--ink-mute)]'}`}>
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-yellow-200 rounded-2xl p-8 shadow-sm">
                  <h3 className="heading-md text-[var(--ink)] mb-6 flex items-center gap-2">
                    <span className="text-xl">⚠️</span> Ready to send?
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="bg-[var(--canvas-soft)] rounded-xl p-4 border border-[var(--hairline)]">
                      <p className="text-[13px] text-[var(--ink-mute)] mb-1">Your application will be emailed to:</p>
                      <p className="text-[15px] font-bold text-[var(--ink)]">{school.name}</p>
                      <p className="text-[13px] text-[var(--ink-mute)] mt-1">{school.contact_email || 'Admissions Office'}</p>
                    </div>

                    <div className="bg-[var(--canvas-soft)] rounded-xl p-4 border border-[var(--hairline)]">
                      <p className="text-[13px] text-[var(--ink-mute)] mb-1">You&apos;ll receive a copy at:</p>
                      <p className="text-[15px] font-bold text-[var(--ink)]">{studentProfile?.students?.email || 'Your email'}</p>
                    </div>

                    <div>
                      <p className="text-[13px] font-semibold text-[var(--ink-mute)] uppercase tracking-wider mb-3">Included:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> Professional application letter
                        </li>
                        <li className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> CV / Resume
                        </li>
                        <li className="flex items-center gap-2 text-[14px] text-[var(--ink)]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" /> Academic Transcript
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {!sent && (
          <div className="p-6 border-t border-[var(--hairline)] bg-white shrink-0 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-medium text-[var(--ink-mute)] hover:bg-[var(--canvas-soft)] transition-colors"
            >
              Cancel
            </button>
            
            {step === 1 && (
              <button 
                onClick={startAIGeneration}
                disabled={loadingProfile}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center gap-2 hover:bg-[var(--primary-deep)] transition-colors disabled:opacity-50"
              >
                Generate Letter <ChevronRight className="w-4 h-4" />
              </button>
            )}
            
            {step === 2 && !generating && (
              <button 
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center gap-2 hover:bg-[var(--primary-deep)] transition-colors"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button 
                onClick={sendApplication}
                disabled={sending}
                className="px-8 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold flex items-center gap-2 hover:bg-[var(--primary-deep)] transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? 'Sending...' : 'Send Application'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
