'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

export default function ProfileProgressHeader() {
  const pathname = usePathname();

  // Determine progress percentage based on route
  let progress = 0;
  if (pathname.includes('/profile/location')) progress = 33;
  else if (pathname.includes('/profile/transport')) progress = 66;
  else if (pathname.includes('/profile/documents')) progress = 90;
  else if (pathname.includes('/profile/complete')) progress = 100;

  return (
    <div className="sticky top-0 z-50 w-full bg-canvas-soft border-b border-hairline h-1.5 overflow-hidden">
      <motion.div
        className="h-full bg-primary"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
      />
    </div>
  );
}
