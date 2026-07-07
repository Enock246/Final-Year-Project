'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { updatePassword } from '../actions';

export default function AccountTab() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUpdatePassword = async () => {
    setErrorMsg('');
    setSuccess(false);

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    
    const result = await updatePassword(newPassword);
    
    setIsSaving(false);
    if (result.error) {
      setErrorMsg(result.error);
    } else {
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  const inputClassName = "text-input w-full min-h-[48px]";
  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <div>
      <h2 className="heading-md mb-6 text-ruby">Account Security</h2>
      
      <div className="space-y-8 max-w-xl">
        
        {/* Change Password */}
        <div className="p-5 md:p-6 rounded-md border border-hairline bg-canvas">
          <h3 className="heading-sm mb-2">Change Password</h3>
          <p className="caption text-ink-mute mb-5">Ensure your account is using a long, random password to stay secure.</p>
          
          <div className="space-y-4">
            <div>
              <label className={labelClassName}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClassName}
                placeholder="Must be at least 8 characters"
              />
            </div>
            
            <div>
              <label className={labelClassName}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClassName}
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleUpdatePassword}
                disabled={isSaving || !newPassword || !confirmPassword}
                className="button-primary min-h-[44px] px-6 flex items-center justify-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </button>
              
              {errorMsg && (
                <div className="mt-3 text-ruby text-sm font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> {errorMsg}
                </div>
              )}
              
              {success && (
                <div className="mt-3 text-primary text-sm font-medium">
                  Password successfully updated.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="p-5 md:p-6 rounded-md border border-ruby/30 bg-ruby/5">
          <h3 className="heading-sm mb-2 text-ruby">Sign Out</h3>
          <p className="caption text-ink-mute mb-5">Sign out of your account on this device.</p>
          
          <button
            onClick={handleSignOut}
            className="px-6 py-2.5 rounded-sm border border-ruby text-ruby hover:bg-ruby hover:text-white font-medium text-[14px] transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

      </div>
    </div>
  );
}
