import pbData from '@/static/pb.json';

interface PBEntry {
  label: string;
  time_sec: number;
  pace_str: string;
  date: string;
  distance_km: number;
}

export default function PersonalBests() {
  const pbs = pbData as PBEntry[];

  if (!pbs.length) return null;

  return (
    <div className="pb-section mb-8">
      <h2 className="mb-3 text-lg font-semibold text-white/90">🏆 个人最佳</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {pbs.map((pb) => {
          const mm = Math.floor(pb.time_sec / 60);
          const ss = pb.time_sec % 60;
          return (
            <div
              key={pb.label}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                borderColor: 'rgba(245, 158, 11, 0.25)',
              }}
            >
              <div className="mb-1 text-xs font-medium text-amber-400/70">
                {pb.label}
              </div>
              <div className="text-xl font-semibold tabular-nums text-white">
                {mm}:{ss.toString().padStart(2, '0')}
              </div>
              <div className="mt-1 text-xs text-gray-500">{pb.pace_str}</div>
              <div className="text-xs text-gray-600">
                {pb.date.slice(0, 10)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
