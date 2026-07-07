'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

interface LiveMapProps {
  schoolLat: number;
  schoolLng: number;
  studentLat: number;
  studentLng: number;
  schoolName: string;
  distanceKm: number;
}

// Custom icons using standard HTML/CSS for a premium look
const createIcon = (type: 'student' | 'school') => {
  const color = type === 'student' ? 'var(--primary, #0066FF)' : 'var(--ruby, #E02424)';
  const label = type === 'student' ? '🏠' : '🏫';
  
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background-color: ${color}; 
        width: 36px; 
        height: 36px; 
        border-radius: 50%; 
        border: 3px solid white;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      ">
        ${label}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Component to adjust map bounds automatically
const MapBounds = ({ schoolPos, studentPos }: { schoolPos: [number, number], studentPos: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([schoolPos, studentPos]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, schoolPos, studentPos]);
  return null;
};

export default function LiveMap({ schoolLat, schoolLng, studentLat, studentLng, schoolName, distanceKm }: LiveMapProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-100 animate-pulse rounded-xl" />;

  const schoolPos: [number, number] = [schoolLat, schoolLng];
  const studentPos: [number, number] = [studentLat, studentLng];
  
  // Custom glassmorphism classes for the tooltips
  const tooltipClass = "!bg-white/90 !backdrop-blur-md !border !border-white/40 !shadow-[0_8px_30px_rgba(0,0,0,0.12)] !text-[var(--ink)] !font-sans !font-semibold !rounded-xl !px-3 !py-1.5";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full relative z-0"
    >
      <MapContainer 
        center={schoolPos} 
        zoom={13} 
        scrollWheelZoom={false} // Prevent accidental zooming when scrolling the page
        className="w-full h-full rounded-[16px] border border-[var(--hairline)] z-0"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <Marker position={studentPos} icon={createIcon('student')}>
          <Tooltip direction="top" offset={[0, -15]} permanent className={tooltipClass}>
            Your House
          </Tooltip>
        </Marker>

        <Marker position={schoolPos} icon={createIcon('school')}>
          <Tooltip direction="top" offset={[0, -15]} permanent className={tooltipClass}>
            {schoolName}
          </Tooltip>
        </Marker>

        <Polyline 
          positions={[studentPos, schoolPos]} 
          color="var(--ink)" 
          weight={3} 
          dashArray="8, 8" 
          opacity={0.6}
        >
          <Tooltip direction="bottom" offset={[0, 10]} permanent className={`${tooltipClass} !text-[var(--primary)] !text-sm`}>
            {distanceKm.toFixed(1)} km
          </Tooltip>
        </Polyline>

        <MapBounds schoolPos={schoolPos} studentPos={studentPos} />
      </MapContainer>

      {/* Floating Get Directions Button */}
      <a 
        href={`https://www.google.com/maps/dir/?api=1&origin=${studentLat},${studentLng}&destination=${schoolLat},${schoolLng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 z-[400] bg-white/95 backdrop-blur-md border border-[var(--hairline)] shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-5 py-2.5 flex items-center gap-2 text-[14px] font-bold text-[var(--ink)] hover:scale-105 hover:bg-white transition-transform duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--primary)]">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
        Directions
      </a>
    </motion.div>
  );
}
