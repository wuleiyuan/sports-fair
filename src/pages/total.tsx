import { useMemo, useState } from 'react';
import ActivityList from '@/components/ActivityList';
import PersonalBests from '@/components/PB';
import ShareModal from '@/components/SharePoster/ShareModal';
import activities from '@/static/activities.json';
import { Activity } from '@/utils/utils';
import { Helmet } from 'react-helmet-async';

function convertTimeToSeconds(time: string): number {
  const parts = time.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

const HomePage = () => {
  const [shareOpen, setShareOpen] = useState(false);

  const stats = useMemo(() => {
    const runs = (activities as Activity[]).filter(
      (a) => a.type === 'Run' && !a.anomaly
    );
    let totalDist = 0;
    let totalTime = 0;
    let maxSpeed = 0;

    for (const a of runs) {
      const d = a.distance / 1000;
      totalDist += d;
      const t = a.moving_time ? convertTimeToSeconds(a.moving_time) : 0;
      totalTime += t;
      const speed = t > 0 ? d / (t / 3600) : 0;
      if (speed > maxSpeed) maxSpeed = speed;
    }

    const avgPace =
      totalTime > 0 && totalDist > 0
        ? totalTime / 60 / totalDist
        : 0;
    const bestPaceMin = maxSpeed > 0 ? 60 / maxSpeed : 0;

    const fmtPace = (min: number) => {
      const m = Math.floor(min);
      const s = Math.round((min - m) * 60);
      return `${m}'${s.toString().padStart(2, '0')}"`;
    };

    return {
      totalDistanceKm: Math.round(totalDist),
      totalTimeHours: Math.round((totalTime / 3600) * 10) / 10,
      totalRuns: runs.length,
      bestPace: bestPaceMin > 0 ? fmtPace(bestPaceMin) : '--',
      avgPace: avgPace > 0 ? fmtPace(avgPace) : '--',
    };
  }, []);

  return (
    <>
      <Helmet>
        <html lang="en" />
      </Helmet>
      <div data-kinetic>
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 8,
            }}
          >
            <button
              onClick={() => setShareOpen(true)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: '1px solid rgba(245,158,11,0.3)',
                background: 'rgba(245,158,11,0.1)',
                color: '#F59E0B',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              分享海报
            </button>
          </div>
          <PersonalBests />
        </div>
        <ActivityList />
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        activities={(activities as Activity[]).filter(
          (a) => a.type === 'Run' && !a.anomaly && a.summary_polyline
        )}
        totalDistanceKm={stats.totalDistanceKm}
        totalTimeHours={stats.totalTimeHours}
        totalRuns={stats.totalRuns}
        bestPace={stats.bestPace}
        avgPace={stats.avgPace}
      />
    </>
  );
};

export default HomePage;
