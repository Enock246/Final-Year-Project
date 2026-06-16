import ProfileProgressHeader from '@/components/ProfileProgressHeader';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <ProfileProgressHeader />
      {children}
    </div>
  );
}
