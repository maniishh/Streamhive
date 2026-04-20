import { useState, useEffect } from 'react';
import Navbar   from './Navbar.jsx';
import Sidebar  from './Sidebar.jsx';

const BREAKPOINT = 900;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= BREAKPOINT : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close drawer whenever screen grows past breakpoint
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main
        className="fade-in"
        style={{
          flex: 1,
          minWidth: 0,
          marginTop: 'var(--navbar-h)',
          // Only push right when sidebar is permanently on-screen (desktop)
          marginLeft: isMobile ? 0 : 'var(--sidebar-w)',
          padding: isMobile ? '16px 12px' : '28px',
          transition: 'margin-left 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
