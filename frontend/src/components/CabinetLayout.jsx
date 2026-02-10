import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Settings, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

const CabinetLayout = () => {
  const { isMobile } = useIsMobile();

  const navItems = [
    { to: '/cabinet', end: true, icon: LayoutDashboard, label: 'Обзор' },
    { to: '/cabinet/projects', icon: FolderOpen, label: 'Проекты' },
    { to: '/cabinet/settings', icon: Settings, label: 'Настройки' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Профиль</h2>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
          <div className="p-3 border-t border-gray-800">
            <NavLink
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ArrowLeft size={16} />
              Вернуться в редактор
            </NavLink>
          </div>
        </aside>
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-16' : ''}`}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex items-center z-40 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                    isActive ? 'text-indigo-400' : 'text-gray-500'
                  }`
                }
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
          <NavLink
            to="/"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-[10px] font-medium">Редактор</span>
          </NavLink>
        </nav>
      )}
    </div>
  );
};

export default CabinetLayout;
