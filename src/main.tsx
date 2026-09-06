import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'

// 🌟 动态刷新浏览器 Tab 标题栏图标，杜绝浏览器内部 SQLite 对旧图标的缓存死锁，并自适应明暗主题
function syncBrowserFavicon() {
  try {
    const isDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
    const targetSvg = isDark
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="7.5 25 220 220" width="100%" height="100%"><polygon points="45,60 135,60 175,100 175,225 45,225" fill="none" stroke="#64748b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/><polygon points="60,45 150,45 190,85 190,210 60,210" fill="none" stroke="#f8fafc" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><polygon points="150,45 150,85 190,85" fill="#ffffff" stroke="#ffffff" stroke-width="2"/><line x1="85" y1="135" x2="165" y2="135" stroke="#cbd5e1" stroke-width="6" stroke-linecap="round"/><line x1="85" y1="165" x2="145" y2="165" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/><circle cx="145" cy="165" r="6" fill="#f59e0b"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="7.5 25 220 220" width="100%" height="100%"><polygon points="45,60 135,60 175,100 175,225 45,225" fill="none" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/><polygon points="60,45 150,45 190,85 190,210 60,210" fill="none" stroke="#0f172a" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><polygon points="150,45 150,85 190,85" fill="#0f172a" stroke="#0f172a" stroke-width="2"/><line x1="85" y1="135" x2="165" y2="135" stroke="#64748b" stroke-width="6" stroke-linecap="round"/><line x1="85" y1="165" x2="145" y2="165" stroke="#d97706" stroke-width="6" stroke-linecap="round"/><circle cx="145" cy="165" r="6" fill="#d97706"/></svg>`;

    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(targetSvg)}`;

    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = dataUri;
  } catch {
    // Graceful fallback
  }
}

syncBrowserFavicon();
if (window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBrowserFavicon);
  } catch {
    // Ignore on older browsers
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
