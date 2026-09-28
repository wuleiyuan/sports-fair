import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import Poster from './Poster';
import { Activity } from '@/utils/utils';
import styles from './style.module.css';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  /** All activities (pass from parent so data is shared) */
  activities: Activity[];
  totalDistanceKm: number;
  totalTimeHours: number;
  totalRuns: number;
  bestPace: string;
  avgPace: string;
}

export default function ShareModal({
  open,
  onClose,
  activities,
  totalDistanceKm,
  totalTimeHours,
  totalRuns,
  bestPace,
  avgPace,
}: ShareModalProps) {
  const posterRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [posterLoaded, setPosterLoaded] = useState(false);

  // Show poster only after modal opens + one frame for layout
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setPosterLoaded(true));
    } else {
      setPosterLoaded(false);
    }
  }, [open]);

  // Clear pending toast timer on unmount to avoid setState on unmounted component
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2000);
  }, []);

  const handleSave = useCallback(async () => {
    if (!posterRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await toPng(posterRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = `sports-fair-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
      showToast('图片已保存');
    } catch {
      showToast('图片生成失败，请尝试复制链接');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(
      () => showToast('已复制，可粘贴到浏览器打开'),
      () => showToast('复制失败，请手动复制地址栏链接')
    );
  }, [showToast]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Poster preview (scaled down) */}
      <div className={styles.posterFrame} onClick={(e) => e.stopPropagation()}>
        {posterLoaded && (
          <div className={styles.posterInner}>
            <Poster
              ref={posterRef}
              activities={activities}
              totalDistanceKm={totalDistanceKm}
              totalTimeHours={totalTimeHours}
              totalRuns={totalRuns}
              bestPace={bestPace}
              avgPace={avgPace}
            />
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className={styles.buttons} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleSave}
          disabled={saving}
          className={styles.buttonPrimary}
        >
          {saving ? '生成中...' : '保存图片'}
        </button>
        <button onClick={handleCopyLink} className={styles.buttonSecondary}>
          复制链接
        </button>
      </div>

      {/* Mobile hint */}
      <div className={styles.hint} onClick={(e) => e.stopPropagation()}>
        长按图片可保存 / 转发
      </div>
    </div>
  );
}
