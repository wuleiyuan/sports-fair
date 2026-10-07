import { IconSportMedal, IconMountain } from '@/components/Icons';
import pbData from '@/static/pb.json';
import hikingPbData from '@/static/hiking_pb.json';

interface RunPBEntry {
  label: string;
  time_sec: number;
  pace_str: string;
  date: string;
  distance_km: number;
}

interface HikingPBEntry {
  label: string;
  distance_km: number;
  moving_time: string; // "H:MM:SS"
  pace_str: string; // "X km/h"
  date: string;
  activity_id?: number;
  activity_name?: string;
  elev_gain?: number;
}

type PBEntry = RunPBEntry | HikingPBEntry;

interface PersonalBestsProps {
  /** Sport key to display PBs for. Defaults to "Run" (backwards compat). */
  sportKey?: string;
}

export default function PersonalBests({
  sportKey = 'Run',
}: PersonalBestsProps) {
  // 按 sport key 选数据源
  const isHiking = sportKey === 'Hiking';
  const pbs: PBEntry[] = isHiking
    ? (hikingPbData as HikingPBEntry[])
    : (pbData as RunPBEntry[]);

  if (!pbs.length) return null;

  const isRunPB = (pb: PBEntry): pb is RunPBEntry =>
    'time_sec' in pb && typeof pb.time_sec === 'number';

  const sectionTitle = isHiking ? '徒步个人最佳' : '跑步个人最佳';
  const SectionIcon = isHiking ? IconMountain : IconSportMedal;
  const accentColor = isHiking ? 'rgb(34, 197, 94)' : 'rgb(245, 158, 11)';
  const accentBg = isHiking
    ? 'rgba(34, 197, 94, 0.08)'
    : 'rgba(245, 158, 11, 0.08)';
  const accentBorder = isHiking
    ? 'rgba(34, 197, 94, 0.25)'
    : 'rgba(245, 158, 11, 0.25)';
  const accentText = isHiking ? 'text-emerald-400/70' : 'text-amber-400/70';

  return (
    <div className="pb-section mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white/90">
        <span
          style={{
            display: 'inline-flex',
            color: accentColor,
          }}
        >
          <SectionIcon size={20} />
        </span>
        {sectionTitle}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {pbs.map((pb, idx) => {
          // 跑步 PB：显示 "MM:SS"（time_sec）+ pace_str
          if (isRunPB(pb)) {
            const mm = Math.floor(pb.time_sec / 60);
            const ss = pb.time_sec % 60;
            return (
              <div
                key={`run-${pb.label}-${idx}`}
                className="rounded-xl border p-4"
                style={{
                  backgroundColor: accentBg,
                  borderColor: accentBorder,
                }}
              >
                <div className={`mb-1 text-xs font-medium ${accentText}`}>
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
          }

          // 徒步 PB：显示距离 + 时长 + 配速
          const hike = pb as HikingPBEntry;
          return (
            <div
              key={`hike-${hike.label}-${idx}`}
              className="rounded-xl border p-4"
              style={{
                backgroundColor: accentBg,
                borderColor: accentBorder,
              }}
            >
              <div className={`mb-1 text-xs font-medium ${accentText}`}>
                {hike.label}
              </div>
              <div className="text-xl font-semibold tabular-nums text-white">
                {hike.distance_km.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-gray-400">
                  km
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                时长 {hike.moving_time} · {hike.pace_str}
              </div>
              <div className="text-xs text-gray-600">
                {hike.date.slice(0, 10)}
                {hike.elev_gain ? ` · ↑${hike.elev_gain}m` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
