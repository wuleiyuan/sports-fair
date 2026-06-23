import React, { useRef, useState, useCallback, useEffect } from 'react';
import { toPng } from 'html-to-image';
import Poster from './Poster';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  /** All activities (pass from parent so data is shared) */
  activities: any[];
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

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
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

  const rawActivities = activities.map((a: any) => a.activity || a);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: '8px 20px',
            borderRadius: 8,
            fontSize: 14,
            zIndex: 10001,
          }}
        >
          {toast}
        </div>
      )}

      {/* Poster preview (scaled down) */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 360,
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          transform: 'scale(1)',
          transformOrigin: 'center center',
          marginBottom: 16,
        }}
      >
        {posterLoaded && (
          <div style={{ transform: 'scale(0.333)', transformOrigin: 'top left', width: 3240, height: 5760 }}>
            <Poster
              ref={posterRef}
              activities={rawActivities}
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
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            border: 'none',
            background: '#F59E0B',
            color: '#000',
            fontSize: 16,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? '生成中...' : '保存图片'}
        </button>
        <button
          onClick={handleCopyLink}
          style={{
            padding: '12px 32px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          复制链接
        </button>
      </div>

      {/* Mobile hint */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          marginTop: 12,
        }}
      >
        长按图片可保存 / 转发
      </div>
    </div>
  );
}
