import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen, Settings, Clock, Film, ArrowRight } from 'lucide-react';
import { API_URL } from '../api/client';

const Dashboard = () => {
  const [stats, setStats] = useState({ total: 0, recent: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/projects?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setStats({ total: data.total, recent: data.projects });
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Добро пожаловать</h1>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Film size={20} className="text-indigo-400" />
            </div>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>
          <p className="text-sm text-gray-500">Всего проектов</p>
        </div>
        <Link to="/cabinet/projects" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <FolderOpen size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Проекты</span>
          </div>
          <p className="text-xs text-gray-500">История созданных видео</p>
        </Link>
        <Link to="/cabinet/settings" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-600/20 rounded-lg">
              <Settings size={20} className="text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white">Настройки</span>
          </div>
          <p className="text-xs text-gray-500">API ключи и интеграции</p>
        </Link>
      </div>

      {/* Recent projects */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Последние проекты</h2>
          <Link to="/cabinet/projects" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            Все проекты <ArrowRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Загрузка...</div>
        ) : stats.recent.length === 0 ? (
          <div className="p-8 text-center">
            <Film size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-3">У вас пока нет проектов</p>
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
              Создать первый проект
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {stats.recent.map((project) => (
              <Link
                key={project.id}
                to={`/?project=${project.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Film size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{project.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-gray-500">{project.width}×{project.height}</span>
                      <span className="text-[10px] text-gray-500">{formatDuration(project.duration)}</span>
                      {project.language && <span className="text-[10px] text-gray-500 uppercase">{project.language}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  <Clock size={10} />
                  {formatDate(project.updated_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
