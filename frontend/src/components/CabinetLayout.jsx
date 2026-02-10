import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Settings, ArrowLeft } from 'lucide-react';

const CabinetLayout = () => {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Профиль</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink
            to="/cabinet"
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <LayoutDashboard size={16} />
            Обзор
          </NavLink>
          <NavLink
            to="/cabinet/projects"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <FolderOpen size={16} />
            Проекты
          </NavLink>
          <NavLink
            to="/cabinet/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Settings size={16} />
            Настройки
          </NavLink>
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
      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default CabinetLayout;
