import { fetchDashboardMatches } from './actions';
import { School, MapPin, Users, Award, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600 bg-green-100 border-green-200';
  if (score >= 70) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  return 'text-orange-600 bg-orange-100 border-orange-200';
}

export default async function DashboardPage() {
  const { matches, profile } = await fetchDashboardMatches();
  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  return (
    <main className="flex-1 p-6 md:p-8 bg-background max-w-7xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          Welcome back, {firstName} 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          We've analyzed your profile and found these internship matches.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match: any) => (
          <div 
            key={match.school_id}
            className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border-4 border-white shadow-clay-sm flex flex-col hover:shadow-clay-md transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-primary/10 p-3 rounded-2xl">
                <School className="w-6 h-6 text-primary" />
              </div>
              <div className={`px-3 py-1.5 rounded-full border-2 text-sm font-bold flex items-center gap-1.5 ${getScoreColor(match.match_score)}`}>
                <Award className="w-4 h-4" />
                {match.match_score}% Match
              </div>
            </div>

            <h3 className="text-xl font-bold mb-2 line-clamp-2">{match.name}</h3>
            
            <div className="space-y-2 mb-6 flex-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <MapPin className="w-4 h-4" />
                <span>{match.town_city} • {match.distance_km ? `${match.distance_km.toFixed(1)} km away` : 'Distance unknown'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <Users className="w-4 h-4" />
                <span>{match.pending_applications} pending • {match.expected_interns} spots total</span>
              </div>
            </div>

            <Link 
              href={`/schools/${match.school_id}`}
              className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-12 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors group"
            >
              View Details
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        ))}

        {matches.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white/50 rounded-3xl border-4 border-dashed border-white">
            <School className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No schools found</h3>
            <p className="text-muted-foreground max-w-md">
              We couldn't find any schools matching your current criteria. Try expanding your search area or checking back later.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
