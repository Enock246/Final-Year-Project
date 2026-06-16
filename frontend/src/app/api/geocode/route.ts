import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';

// Validate latitude and longitude as valid geographic bounds
const GeocodeSchema = z.object({
  lat: z.string().transform(Number).refine(n => !isNaN(n) && n >= -90 && n <= 90, { message: 'Invalid latitude' }),
  lon: z.string().transform(Number).refine(n => !isNaN(n) && n >= -180 && n <= 180, { message: 'Invalid longitude' }),
});

export async function GET(request: Request) {
  // Check authentication before allowing geocoding
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please sign in to use this service.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  
  try {
    const validatedData = GeocodeSchema.parse({
      lat: searchParams.get('lat'),
      lon: searchParams.get('lon'),
    });
    
    const { lat, lon } = validatedData;

    // We use zoom=18 for highest precision (building/street level) as requested
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const res = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'InternConnect-App/1.0', // Required by Nominatim policy
      },
    });

    if (!res.ok) {
      throw new Error(`Nominatim API responded with status: ${res.status}`);
    }

    const data = await res.json();

    if (!data || !data.address) {
      return NextResponse.json(
        { error: 'Could not determine address' },
        { status: 404 }
      );
    }

    const { state, town, city, village, county, suburb, road } = data.address;
    
    const rawRegion = state || county || '';
    const cleanRegion = rawRegion.replace(/ Region/i, '').trim();
    // Prioritize precise local names over generic cities
    const detectedTown = suburb || town || city || village || road || '';

    return NextResponse.json({
      region: cleanRegion,
      town: detectedTown,
      fullAddress: data.display_name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Geocoding backend error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing location' },
      { status: 500 }
    );
  }
}
