'use client';

import { useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { updateProfile } from '@/app/profile/actions';
import regionsData from '@/data/regions.json';

export default function ProfileTab({ initialData }: { initialData: any }) {
  const [selectedRegion, setSelectedRegion] = useState(initialData?.region_name || '');
  const [selectedDistrict, setSelectedDistrict] = useState(initialData?.district_name || '');
  const [townCity, setTownCity] = useState(initialData?.town_city || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeDistricts = regionsData.find((r) => r.name === selectedRegion)?.districts || [];

  const handleSave = async () => {
    setIsSaving(true);
    setSuccess(false);
    
    const result = await updateProfile({
      town_city: townCity,
      region_name: selectedRegion,
      district_name: selectedDistrict,
    });
    
    setIsSaving(false);
    if (result.error) {
      alert(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const inputClassName = "text-input w-full min-h-[48px]";
  const labelClassName = "text-[13px] font-medium text-ink-secondary mb-1.5 block";

  return (
    <div>
      <h2 className="heading-md mb-6">Personal Profile</h2>
      
      <div className="space-y-5 max-w-xl">
        {/* Read-only fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClassName}>Full Name</label>
            <input type="text" value={initialData?.full_name || ''} readOnly className={`${inputClassName} bg-canvas-soft opacity-70`} />
          </div>
          <div>
            <label className={labelClassName}>Email Address</label>
            <input type="email" value={initialData?.email || ''} readOnly className={`${inputClassName} bg-canvas-soft opacity-70`} />
          </div>
        </div>

        <hr className="border-hairline my-6" />
        <h3 className="heading-sm mb-4">Location Settings</h3>

        <div>
          <label className={labelClassName}>Region</label>
          <div className="relative">
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedDistrict('');
              }}
              className={`${inputClassName} appearance-none pr-10`}
            >
              <option value="" disabled>Select Region</option>
              {regionsData.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClassName}>District</label>
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              disabled={!selectedRegion}
              className={`${inputClassName} appearance-none pr-10 disabled:opacity-50`}
            >
              <option value="" disabled>Select District</option>
              {activeDistricts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClassName}>Town or City</label>
          <input
            type="text"
            value={townCity}
            onChange={(e) => setTownCity(e.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="button-primary min-h-[44px] px-6 flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </button>
          
          {success && (
            <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
