'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle2, File, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { completeProfile } from '@/app/profile/actions';

type DocumentType = 'cv' | 'transcript' | 'placement';

interface UploadedDoc {
  file: File;
  name: string;
  size: number;
  isProcessing?: boolean;
  alreadyUploaded?: boolean;
}

export default function DocumentsTab({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [docs, setDocs] = useState<Record<DocumentType, UploadedDoc | null>>({
    cv: null,
    transcript: null,
    placement: null,
  });

  useEffect(() => {
    if (initialData) {
      setDocs(prev => {
        const newDocs = { ...prev };
        if (initialData.cv_file_path) {
          newDocs.cv = { file: new window.File([], 'cv.pdf'), name: 'Current CV', size: 1000, isProcessing: false, alreadyUploaded: true };
        }
        if (initialData.transcript_file_path) {
          newDocs.transcript = { file: new window.File([], 'transcript.pdf'), name: 'Current Transcript', size: 1000, isProcessing: false, alreadyUploaded: true };
        }
        if (initialData.placement_letter_path) {
          newDocs.placement = { file: new window.File([], 'placement.pdf'), name: 'Current Placement Letter', size: 1000, isProcessing: false, alreadyUploaded: true };
        }
        return newDocs;
      });
    }
  }, [initialData]);

  const fileInputRefs = {
    cv: useRef<HTMLInputElement>(null),
    transcript: useRef<HTMLInputElement>(null),
    placement: useRef<HTMLInputElement>(null),
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  const handleFileChange = async (type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Invalid file type. Only PDF and Word documents are allowed.');
        if (fileInputRefs[type].current) fileInputRefs[type].current!.value = '';
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        alert('File size exceeds 5MB limit.');
        if (fileInputRefs[type].current) fileInputRefs[type].current!.value = '';
        return;
      }

      setDocs(prev => ({
        ...prev,
        [type]: { file, name: file.name, size: file.size, isProcessing: true }
      }));

      await new Promise(r => setTimeout(r, 600));

      setDocs(prev => ({
        ...prev,
        [type]: { file, name: file.name, size: file.size, isProcessing: false }
      }));
    }
  };

  const removeFile = (type: DocumentType) => {
    setDocs(prev => ({ ...prev, [type]: null }));
    if (fileInputRefs[type].current) fileInputRefs[type].current!.value = '';
  };

  const handleSave = async () => {
    setIsUploading(true);
    setErrorMsg('');
    setSuccess(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("Authentication required.");
      setIsUploading(false);
      return;
    }

    try {
      const paths: Record<string, string> = {};
      
      for (const type of ['cv', 'transcript', 'placement'] as DocumentType[]) {
        const doc = docs[type];
        // If it's a new file (not already uploaded)
        if (doc && !doc.isProcessing && !doc.alreadyUploaded) {
          const file = doc.file;
          const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
          const fileName = `${user.id}/${type}_${Date.now()}_${safeOriginalName}`;
          
          const { data, error } = await supabase.storage.from('documents').upload(fileName, file);
            
          if (error) throw error;
          if (data) {
            if (type === 'placement') paths['placement_letter_path'] = data.path;
            else paths[`${type}_file_path`] = data.path;
            
            // Mark as already uploaded now
            setDocs(prev => ({
              ...prev,
              [type]: { ...prev[type]!, alreadyUploaded: true }
            }));
          }
        }
      }

      if (Object.keys(paths).length > 0) {
        const profileResult = await completeProfile(paths);
        if (profileResult.error) throw new Error(profileResult.error);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // No new files uploaded
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload documents.');
    } finally {
      setIsUploading(false);
    }
  };

  const FileUploadBox = ({ title, type, isRequired, icon: Icon }: { title: string, type: DocumentType, isRequired: boolean, icon: any }) => {
    const doc = docs[type];
    const isProcessing = doc?.isProcessing;

    return (
      <div 
        onClick={() => !doc && !isProcessing && fileInputRefs[type].current?.click()}
        className={`w-full p-4 rounded-md text-left transition-all relative overflow-hidden flex flex-col justify-center min-h-[90px] ${
          doc && !isProcessing
            ? 'bg-canvas border border-hairline-input shadow-sm' 
            : 'bg-primary-subdued/10 border border-dashed border-primary/30 hover:bg-primary-subdued/30 hover:border-primary/50 cursor-pointer'
        }`}
      >
        <div className="flex items-start justify-between w-full">
          <div className="flex items-start gap-3 w-full">
            <div className={`p-2 rounded-sm shrink-0 transition-colors ${doc && !isProcessing ? 'bg-primary-subdued text-primary-deep' : 'bg-canvas border border-hairline-input text-primary'}`}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : doc ? (
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <Icon className="w-4 h-4 stroke-[2]" />
              )}
            </div>
            
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-semibold text-[14px] text-ink flex items-center gap-1.5 leading-tight mb-0.5">
                {title}
                {isRequired && <span className="text-ruby">*</span>}
              </h3>
              
              {!doc ? (
                <p className="caption text-ink-mute">PDF or Word doc (Max 5MB)</p>
              ) : isProcessing ? (
                <p className="caption text-primary font-medium animate-pulse">Scanning document...</p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="caption font-medium text-ink-secondary truncate max-w-[140px]">
                    {doc.name}
                  </p>
                  {!doc.alreadyUploaded && (
                    <span className="micro text-ink-mute shrink-0">
                      {(doc.size / 1024).toFixed(0)} KB
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="shrink-0 flex items-center">
            {!doc ? (
              <span className="caption font-semibold text-primary bg-primary-subdued px-3 py-1.5 rounded-sm">
                Upload
              </span>
            ) : !isProcessing && (
              <div className="flex flex-col gap-1.5">
                <span 
                  onClick={(e) => { e.stopPropagation(); fileInputRefs[type].current?.click(); }}
                  className="micro font-medium text-ink-mute hover:text-ink transition-colors cursor-pointer text-right"
                >
                  Replace
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); removeFile(type); }}
                  className="micro font-medium text-ruby hover:text-ruby-press transition-colors cursor-pointer text-right"
                >
                  Remove
                </span>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept=".pdf,.doc,.docx"
              ref={fileInputRefs[type]}
              onChange={(e) => handleFileChange(type, e)}
            />
          </div>
        </div>

        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 0.6, ease: "linear" }}
              className="absolute bottom-0 left-0 h-0.5 bg-primary"
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div>
      <h2 className="heading-md mb-6">Documents</h2>
      <p className="body-md text-ink-mute mb-8 max-w-2xl">
        Upload or replace your CV, academic transcripts, and placement letters. Files must be PDF or Word format and under 5MB.
      </p>

      <div className="space-y-4 max-w-2xl">
        <FileUploadBox title="Curriculum Vitae (CV)" type="cv" isRequired={true} icon={FileText} />
        <FileUploadBox title="Academic Transcripts" type="transcript" isRequired={true} icon={File} />
        <FileUploadBox title="Placement Letter" type="placement" isRequired={false} icon={FileText} />
        
        <div className="pt-6">
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="button-primary min-h-[44px] px-6 flex items-center justify-center gap-2"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Documents'}
          </button>
          
          {errorMsg && (
            <div className="mt-3 text-ruby text-sm font-medium">{errorMsg}</div>
          )}
          
          {success && (
            <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Documents saved successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
