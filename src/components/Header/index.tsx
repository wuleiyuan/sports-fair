import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { useTheme, Theme } from '@/hooks/useTheme';
import styles from './style.module.css';

const NAV = [
  { to: '/sports', label: '运动总览', icon: '🏅' },
  { to: '/summary', label: '旅程总览', icon: '📊' },
  { to: '/health', label: '健康分析', icon: '💚' },
  { to: '/health-assess', label: '评估建议', icon: '🩺' },
  { to: '/training', label: '训练负荷', icon: '🏋️' },
];

const Header = () => {
  const { logo, navLinks } = useSiteMetadata();
  const { setTheme } = useTheme();
  const { pathname } = useLocation();
  const [currentIconIndex, setCurrentIconIndex] = useState(0);

  const icons = [
    {
      id: 'dark',
      svg: (
        <svg width="20" height="21" viewBox="0 0 22 23" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21.7519 15.0137C20.597 15.4956 19.3296 15.7617 18 15.7617C12.6152 15.7617 8.25 11.3965 8.25 6.01171C8.25 4.68211 8.51614 3.41468 8.99806 2.25977C5.47566 3.72957 3 7.20653 3 11.2617C3 16.6465 7.36522 21.0117 12.75 21.0117C16.8052 21.0117 20.2821 18.536 21.7519 15.0137Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: 'light',
      svg: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 3.00464V5.25464M18.364 5.64068L16.773 7.23167M21 12.0046H18.75M18.364 18.3686L16.773 16.7776M12 18.7546V21.0046M7.22703 16.7776L5.63604 18.3686M5.25 12.0046H3M7.22703 7.23167L5.63604 5.64068M15.75 12.0046C15.75 14.0757 14.0711 15.7546 12 15.7546C9.92893 15.7546 8.25 14.0757 8.25 12.0046C8.25 9.93357 9.92893 8.25464 12 8.25464C14.0711 8.25464 15.75 9.93357 15.75 12.0046Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
  ];

  const handleToggle = () => {
    const nextIndex = (currentIconIndex + 1) % icons.length;
    setCurrentIconIndex(nextIndex);
    setTheme(icons[nextIndex].id as Theme);
  };

  const currentIcon = icons[currentIconIndex];

  const isActive = (to: string) =>
    pathname === to || (to !== '/' && pathname.startsWith(to + '/'));

  return (
    <header className={styles.bar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand} aria-label="Sports Fair 首页">
          <img className={styles.logo} src={logo} alt="logo" />
          <span className={styles.wordmark}>Sports Fair</span>
        </Link>

        <nav className={styles.nav}>
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`${styles.link} ${isActive(item.to) ? styles.linkActive : ''}`}
            >
              <span className={styles.linkIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {navLinks.map((n, i) => (
            <a key={i} href={n.url} className={styles.link} target="_blank" rel="noreferrer">
              {n.name}
            </a>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleToggle}
          className={styles.themeButton}
          aria-label={`切换到 ${currentIcon.id} 主题`}
          title={`切换到 ${currentIcon.id} 主题`}
        >
          <span className={styles.iconWrapper}>{currentIcon.svg}</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
