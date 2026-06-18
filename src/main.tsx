import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Index from './pages';
import NotFound from './pages/404';
import SportsOverview from './pages/sports-overview';
import SportDetail from './pages/sport-detail';
import ReactGA from 'react-ga4';
import {
  GOOGLE_ANALYTICS_TRACKING_ID,
  USE_GOOGLE_ANALYTICS,
} from './utils/const';
import '@/styles/index.css';
import { withOptionalGAPageTracking } from './utils/trackRoute';
import HomePage from '@/pages/total';
import HealthPage from '@/pages/health';
import HealthAssessPage from '@/pages/health-assess';

if (USE_GOOGLE_ANALYTICS) {
  ReactGA.initialize(GOOGLE_ANALYTICS_TRACKING_ID);
}

const routes = createBrowserRouter(
  [
    {
      path: '/',
      element: withOptionalGAPageTracking(<Index />),
    },
    {
      path: 'summary',
      element: withOptionalGAPageTracking(<HomePage />),
    },
    {
      path: 'sports',
      element: withOptionalGAPageTracking(<SportsOverview />),
    },
    {
      path: 'sports/:key',
      element: withOptionalGAPageTracking(<SportDetail />),
    },
    {
      path: 'health',
      element: withOptionalGAPageTracking(<HealthPage />),
    },
    {
      path: 'health-assess',
      element: withOptionalGAPageTracking(<HealthAssessPage />),
    },
    {
      path: '*',
      element: withOptionalGAPageTracking(<NotFound />),
    },
  ],
  { basename: import.meta.env.BASE_URL }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <RouterProvider router={routes} />
    </HelmetProvider>
  </React.StrictMode>
);

// v2.3.0: PWA Service Worker 注册
// 只在生产环境注册 (开发环境会被 HMR/cache 冲突搞炸)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // 静默注册, 失败不打扰用户
        console.log('[SW] registered, scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[SW] registration failed:', err);
      });
  });
}
