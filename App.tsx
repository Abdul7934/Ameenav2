import React from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { StudyPage } from './pages/StudyPage';
import QuizPage from './pages/QuizPage';
import DashboardPage from './pages/DashboardPage';
import { UploadedContentProvider } from './contexts/UploadedContentContext';
import { AmeenaLogoIcon, HomeIcon, BarChartIcon, BookOpenIcon, ClipboardListIcon } from './components/icons/Icons';
import ThemeToggleButton from './components/common/ThemeToggleButton';

const App: React.FC = () => {
  return (
    <UploadedContentProvider>
      <HashRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <div className="floating-actions">
              <ThemeToggleButton />
            </div>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/study/:contentId" element={<StudyPage />} />
              <Route path="/quiz/:contentId" element={<QuizPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </UploadedContentProvider>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Home', icon: HomeIcon },
    { path: '/dashboard', label: 'Dashboard', icon: BarChartIcon },
  ];

  const contentPathRegex = /^\/(study|quiz)\/(\w+)$/;
  const match = location.pathname.match(contentPathRegex);
  const showDynamicLinks = !!match;
  const contentId = match ? match[2] : null;

  return (
    <aside className="sidebar">
      <div>
        <Link to="/" className="sidebar-header">
          <AmeenaLogoIcon style={{width: 32, height: 32}} />
          <span>Ameena AI</span>
        </Link>
        
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} end className={({isActive}) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {showDynamicLinks && contentId && (
          <>
            <div className="sidebar-divider"></div>
            <nav className="sidebar-nav">
              <NavLink to={`/study/${contentId}`} className={({isActive}) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <BookOpenIcon />
                <span>Study Session</span>
              </NavLink>
              <NavLink to={`/quiz/${contentId}`} className={({isActive}) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                  <ClipboardListIcon />
                  <span>Knowledge Check</span>
              </NavLink>
            </nav>
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <p>&copy; {new Date().getFullYear()} Ameena AI.</p>
      </div>
    </aside>
  );
};

export default App;