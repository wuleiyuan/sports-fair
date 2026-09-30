import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  lazy,
  Suspense,
} from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Helmet } from 'react-helmet-async';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useInterval } from '@/hooks/useInterval';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { IS_CHINESE, MAP_HEIGHT } from '@/utils/const';

const RunMap = lazy(() => import('@/components/RunMap'));
import {
  Activity,
  IViewState,
  filterAndSortRuns,
  filterCityRuns,
  filterTitleRuns,
  filterYearRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  scrollToMap,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';
import { useTheme, useThemeChangeCounter } from '@/hooks/useTheme';
import SportCard from '@/components/SportCard';
import SportIcon from '@/components/SportIcon';
import { SPORT_BY_KEY, normalizeSportType } from '@/utils/sportTypes';
import { convertMovingTime2Sec } from '@/utils/utils';
import activitiesRaw from '@/static/activities.json';
import {
  IconChart,
  IconHeart,
  IconClipboard,
  IconBolt,
  IconSportRun,
} from '@/components/Icons';

// 用户最爱运动：按 count 算最高；聚合 elevation + weighted pace 给 SportCard
const favoriteSportStats = (() => {
  const stats: Record<
    string,
    {
      count: number;
      totalDistance: number;
      totalTime: number;
      totalReps: number;
      totalElevation: number;
      totalSpeedWeighted: number;
      lastDate?: string;
    }
  > = {};
  (activitiesRaw as unknown[] as Array<Record<string, unknown>>).forEach(
    (act) => {
      const key = normalizeSportType(
        (act.type as string) ?? '',
        (act.name as string) ?? ''
      );
      if (!stats[key]) {
        stats[key] = {
          count: 0,
          totalDistance: 0,
          totalTime: 0,
          totalReps: 0,
          totalElevation: 0,
          totalSpeedWeighted: 0,
        };
      }
      const dist = (act.distance as number) || 0;
      stats[key].count++;
      stats[key].totalDistance += dist;
      stats[key].totalTime += convertMovingTime2Sec(
        (act.moving_time as string) || '0'
      );
      const reps = act.reps as number | undefined;
      if (typeof reps === 'number' && reps > 0) stats[key].totalReps += reps;
      const elev = act.elevation_gain as number | undefined;
      if (typeof elev === 'number' && elev > 0)
        stats[key].totalElevation += elev;
      const speed = act.average_speed as number | undefined;
      if (typeof speed === 'number' && speed > 0 && dist > 0) {
        stats[key].totalSpeedWeighted += speed * dist;
      }
      const date =
        (act.start_date_local as string) || (act.start_date as string);
      if (!stats[key].lastDate || (date && date > stats[key].lastDate)) {
        stats[key].lastDate = date;
      }
    }
  );
  let maxKey: string | null = null;
  let maxCount = 0;
  for (const [k, v] of Object.entries(stats)) {
    if (v.count > maxCount) {
      maxCount = v.count;
      maxKey = k;
    }
  }
  if (!maxKey) return null;
  const s = stats[maxKey];
  const avgSpeed =
    s.totalDistance > 0 ? s.totalSpeedWeighted / s.totalDistance : 0;
  const avgPace = avgSpeed > 0 ? 1000 / avgSpeed : 0;
  return {
    sport: SPORT_BY_KEY[maxKey],
    count: s.count,
    totalDistance: s.totalDistance,
    totalTime: s.totalTime,
    totalReps: s.totalReps,
    totalElevation: s.totalElevation,
    avgPace,
    totalFloors: s.totalReps,
    lastDate: s.lastDate,
  };
})();

// Static nav config — hoisted to module scope so it's not re-allocated on every render.
// Equivalent to useMemo([]) but cheaper.
// 用 SVG 图标组件替代 emoji（ui-ux-pro-max 反模式）
const PAGE_LINKS = [
  { href: '/summary', label: 'Stats', Icon: IconChart },
  { href: '/health', label: 'Health', Icon: IconHeart },
  { href: '/health-assess', label: 'AI Assess', Icon: IconClipboard },
  { href: '/training', label: 'Training', Icon: IconBolt },
  { href: '/sports', label: 'Sports', Icon: IconSportRun },
] as const;

const Index = () => {
  const { siteTitle, siteUrl } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const themeChangeCounter = useThemeChangeCounter();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [title, setTitle] = useState('');
  // Animation states for replacing intervalIdRef
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentAnimationIndex, setCurrentAnimationIndex] = useState(0);
  const [animationRuns, setAnimationRuns] = useState<Activity[]>([]);
  const [currentFilter, setCurrentFilter] = useState<{
    item: string;
    func: (_run: Activity, _value: string) => boolean;
  }>({ item: thisYear, func: filterYearRuns });

  // State to track if we're showing a single run from URL hash
  const [singleRunId, setSingleRunId] = useState<number | null>(null);

  // Animation trigger for single runs - increment this to force animation replay
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const selectedRunIdRef = useRef<number | null>(null);
  const selectedRunDateRef = useRef<string | null>(null);

  // Parse URL hash on mount to check for run ID
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash.startsWith('run_')) {
      const runId = parseInt(hash.replace('run_', ''), 10);
      if (!isNaN(runId)) {
        setSingleRunId(runId);
      }
    }

    // Listen for hash changes (browser back/forward buttons)
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '');
      if (newHash && newHash.startsWith('run_')) {
        const runId = parseInt(newHash.replace('run_', ''), 10);
        if (!isNaN(runId)) {
          setSingleRunId(runId);
        }
      } else {
        // Hash was cleared, reset to normal view
        setSingleRunId(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Memoize expensive calculations
  // 主页只显示跑步活动（Run 类型），爬楼/跳绳/骑行等去 /sports/<type> 看
  const runs = useMemo(() => {
    const onlyRuns = (activities as unknown as Activity[]).filter(
      (a) => a.type === 'Run'
    );
    return filterAndSortRuns(
      onlyRuns,
      currentFilter.item,
      currentFilter.func,
      sortDateFunc
    );
  }, [activities, currentFilter.item, currentFilter.func]);

  const geoData = useMemo(() => {
    return geoJsonForRuns(runs);
  }, [runs, themeChangeCounter]);

  // for auto zoom
  const bounds = useMemo(() => {
    return getBoundsForGeoData(geoData);
  }, [geoData]);

  const [viewState, setViewState] = useState<IViewState>(() => ({
    ...bounds,
  }));

  // Add state for animated geoData to handle the animation effect
  const [animatedGeoData, setAnimatedGeoData] = useState(geoData);

  // Use useInterval for animation instead of intervalIdRef
  useInterval(
    () => {
      if (!isAnimating || currentAnimationIndex >= animationRuns.length) {
        setIsAnimating(false);
        setAnimatedGeoData(geoData);
        return;
      }

      const runsNum = animationRuns.length;
      const sliceNum = runsNum >= 8 ? Math.ceil(runsNum / 8) : 1;
      const nextIndex = Math.min(currentAnimationIndex + sliceNum, runsNum);
      const tempRuns = animationRuns.slice(0, nextIndex);
      setAnimatedGeoData(geoJsonForRuns(tempRuns));
      setCurrentAnimationIndex(nextIndex);

      if (nextIndex >= runsNum) {
        setIsAnimating(false);
        setAnimatedGeoData(geoData);
      }
    },
    isAnimating ? 300 : null
  );

  // Helper function to start animation
  const startAnimation = useCallback(
    (runsToAnimate: Activity[]) => {
      if (runsToAnimate.length === 0) {
        setAnimatedGeoData(geoData);
        return;
      }

      const sliceNum =
        runsToAnimate.length >= 8 ? Math.ceil(runsToAnimate.length / 8) : 1;
      setAnimationRuns(runsToAnimate);
      setCurrentAnimationIndex(sliceNum);
      setIsAnimating(true);
    },
    [geoData]
  );

  const changeByItem = useCallback(
    (
      item: string,
      name: string,
      func: (_run: Activity, _value: string) => boolean
    ) => {
      scrollToMap();
      if (name != 'Year') {
        setYear(thisYear);
      }
      setCurrentFilter({ item, func });
      setRunIndex(-1);
      setTitle(`${item} ${name} Running Heatmap`);
      // Reset single run state when changing filters
      setSingleRunId(null);
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname);
      }
    },
    [thisYear]
  );

  const changeYear = useCallback(
    (y: string) => {
      // default year
      setYear(y);

      if ((viewState.zoom ?? 0) > 3 && bounds) {
        setViewState({
          ...bounds,
        });
      }

      changeByItem(y, 'Year', filterYearRuns);
      // Stop current animation
      setIsAnimating(false);
    },
    [viewState.zoom, bounds, changeByItem]
  );

  const changeCity = useCallback(
    (city: string) => {
      changeByItem(city, 'City', filterCityRuns);
    },
    [changeByItem]
  );

  const changeTitle = useCallback(
    (title: string) => {
      changeByItem(title, 'Title', filterTitleRuns);
    },
    [changeByItem]
  );

  // For RunTable compatibility - create a mock setActivity function
  const setActivity = useCallback((_newRuns: Activity[]) => {
    // Since we're using memoized runs, we can't directly set activity
    // This is used by RunTable but we can work around it by managing the filter instead
    console.warn('setActivity called but runs are now computed from filters');
  }, []);

  const locateActivity = useCallback(
    (runIds: RunIds) => {
      const ids = new Set(runIds);

      const selectedRuns = !runIds.length
        ? runs
        : runs.filter((r: any) => ids.has(r.run_id));

      if (!selectedRuns.length) {
        return;
      }

      const lastRun = selectedRuns.sort(sortDateFunc)[0];

      if (!lastRun) {
        return;
      }

      // Set runIndex for table highlighting when single run is selected
      if (runIds.length === 1) {
        const runId = runIds[0];
        const runIdx = runs.findIndex((run) => run.run_id === runId);
        setRunIndex(runIdx);
      } else {
        setRunIndex(-1);
      }

      // Update URL hash when a single run is located
      if (runIds.length === 1) {
        const runId = runIds[0];
        const newHash = `#run_${runId}`;
        if (window.location.hash !== newHash) {
          window.history.pushState(null, '', newHash);
        }
        setSingleRunId(runId);
      } else {
        // If multiple runs or no runs, clear the hash and single run state
        if (window.location.hash) {
          window.history.pushState(null, '', window.location.pathname);
        }
        setSingleRunId(null);
      }

      // Create geoData for selected runs and calculate new bounds
      const selectedGeoData = geoJsonForRuns(selectedRuns);
      const selectedBounds = getBoundsForGeoData(selectedGeoData);

      // Stop any existing animation
      setIsAnimating(false);

      // Update the animated geoData immediately to trigger RunMap animation
      setAnimatedGeoData(selectedGeoData);

      // For single run, trigger animation by incrementing the trigger
      if (runIds.length === 1) {
        setAnimationTrigger((prev) => prev + 1);
      }

      // Update view state
      setViewState({
        ...selectedBounds,
      });
      setTitle(titleForShow(lastRun));
      scrollToMap();
    },
    [runs]
  );

  // Auto locate activity when singleRunId is set and activities are loaded
  // First, detect the run's year and switch to it if needed
  useEffect(() => {
    if (singleRunId !== null && activities.length > 0) {
      const targetRun = activities.find((run) => run.run_id === singleRunId);
      if (targetRun) {
        const runYear = targetRun.start_date_local.slice(0, 4);
        if (year !== runYear) {
          setYear(runYear);
          setCurrentFilter({ item: runYear, func: filterYearRuns });
        }
      } else {
        // If run doesn't exist, clear the hash and show a warning
        console.warn(`Run with ID ${singleRunId} not found in activities`);
        window.history.replaceState(null, '', window.location.pathname);
        setSingleRunId(null);
      }
    }
  }, [singleRunId, activities]);

  useEffect(() => {
    if (singleRunId !== null && runs.length > 0) {
      const runExistsInCurrentRuns = runs.some(
        (run) => run.run_id === singleRunId
      );
      if (runExistsInCurrentRuns) {
        locateActivity([singleRunId]);
      }
    }
  }, [runs, singleRunId, locateActivity]);

  // Update bounds when geoData changes
  useEffect(() => {
    if (singleRunId === null) {
      setViewState((prev) => ({
        ...prev,
        ...bounds,
      }));
    }
  }, [bounds, singleRunId]);

  // Animate geoData when runs change
  useEffect(() => {
    if (singleRunId === null) {
      startAnimation(runs);
    }
  }, [runs, startAnimation, singleRunId]);

  useEffect(() => {
    if (year !== 'Total') {
      return;
    }

    let svgStat = document.getElementById('svgStat');
    if (!svgStat) {
      return;
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        // Use querySelector to get the <desc> element and the <title> element.
        const descEl = target.querySelector('desc');
        if (descEl) {
          // If the runId exists in the <desc> element, it means that a running route has been clicked.
          const runId = Number(descEl.innerHTML);
          if (!runId) {
            return;
          }
          if (selectedRunIdRef.current === runId) {
            selectedRunIdRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunIdRef.current = runId;
            locateActivity([runId]);
          }
          return;
        }

        const titleEl = target.querySelector('title');
        if (titleEl) {
          // If the runDate exists in the <title> element, it means that a date square has been clicked.
          const [runDate] = titleEl.innerHTML.match(
            /\d{4}-\d{1,2}-\d{1,2}/
          ) || [`${+thisYear + 1}`];
          const runIDsOnDate = runs
            .filter((r) => r.start_date_local.slice(0, 10) === runDate)
            .map((r) => r.run_id);
          if (!runIDsOnDate.length) {
            return;
          }
          if (selectedRunDateRef.current === runDate) {
            selectedRunDateRef.current = null;
            locateActivity(runs.map((r) => r.run_id));
          } else {
            selectedRunDateRef.current = runDate;
            locateActivity(runIDsOnDate);
          }
        }
      }
    };
    svgStat.addEventListener('click', handleClick);
    return () => {
      svgStat && svgStat.removeEventListener('click', handleClick);
    };
  }, [year]);

  const { theme } = useTheme();

  return (
    <Layout>
      <Helmet>
        <html lang="en" data-theme={theme} />
      </Helmet>
      <div data-kinetic className="k-page">
        {/* ── Landing intro ── */}
        <section className="k-landing">
          <p className="k-landing-desc">
            {IS_CHINESE
              ? '多数据源运动仪表盘，支持跑步 / 骑行 / 游泳 / 跳绳等运动类型。地图追踪、健康评估、训练分析，一站式开源自部署。'
              : 'Multi-source sports dashboard with map tracking, health assessment, and training load analysis. Self-hosted & open-source.'}
          </p>
          <nav className="k-landing-nav">
            {PAGE_LINKS.map(({ href, label, Icon }) => (
              <a key={href} href={href} className="k-landing-pill">
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </a>
            ))}
            <a
              href="https://github.com/wuleiyuan/sports-fair"
              className="k-landing-pill k-landing-pill-gh"
            >
              {/* ⭐ 是装饰性保留：作为 rating/repo 标识不算结构图标 */}
              <span aria-hidden="true">⭐</span>
              <span>GitHub</span>
            </a>
          </nav>

          {/* 用户最爱运动 — 用 SportCard 显示 priorityMetrics 优先级指标 */}
          {favoriteSportStats && (
            <div className="mt-6 max-w-md">
              <div className="mb-2 text-xs uppercase tracking-wider text-gray-500">
                {IS_CHINESE ? '你的最爱' : 'Your favorite'}
              </div>
              <SportCard
                sport={favoriteSportStats.sport}
                count={favoriteSportStats.count}
                totalDistance={favoriteSportStats.totalDistance}
                totalTime={favoriteSportStats.totalTime}
                totalReps={favoriteSportStats.totalReps}
                totalElevation={favoriteSportStats.totalElevation}
                avgPace={favoriteSportStats.avgPace}
                totalFloors={favoriteSportStats.totalFloors}
                lastDate={favoriteSportStats.lastDate}
                href={`/sports/${favoriteSportStats.sport.key}`}
              />
            </div>
          )}
        </section>

        <div className="flex flex-wrap">
          <div className="w-full lg:w-1/3">
            <div className="k-landing-title-area">
              <h1 className="k-landing-title">
                <a href={siteUrl}>{siteTitle}</a>
              </h1>
              <p className="k-landing-subtitle">
                {IS_CHINESE ? '跑步 · 全量记录' : 'Running · Full Archive'}
              </p>
            </div>
            {IS_CHINESE ? (
              <LocationStat
                changeYear={changeYear}
                changeCity={changeCity}
                changeTitle={changeTitle}
                sportKey="Run"
              />
            ) : (
              <YearsStat year={year} onClick={changeYear} />
            )}
          </div>
          <div className="w-full lg:w-2/3" id="map-container">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="w-full" style={{ height: MAP_HEIGHT }}>
                    <SkeletonCard />
                  </div>
                }
              >
                <RunMap
                  title={title}
                  viewState={viewState}
                  geoData={animatedGeoData}
                  setViewState={setViewState}
                  changeYear={changeYear}
                  thisYear={year}
                  animationTrigger={animationTrigger}
                />
              </Suspense>
            </ErrorBoundary>
            {year === 'Total' ? (
              <SVGStat />
            ) : (
              <RunTable
                runs={runs}
                locateActivity={locateActivity}
                setActivity={setActivity}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />
            )}
          </div>
          {import.meta.env.VERCEL && <Analytics />}
        </div>
      </div>
    </Layout>
  );
};

export default Index;
