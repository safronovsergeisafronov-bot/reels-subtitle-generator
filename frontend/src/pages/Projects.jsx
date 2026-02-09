import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Clock, Trash2, Search, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/projects?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Удалить проект "${name}"?`)) return;
    try {
      await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

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

  const filtered = search
    ? projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Проекты</h1>
          <p className="text-sm text-gray-500 mt-1">{total} проектов</p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Новый проект
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск проектов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-12">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Film size={40} className="text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">{search ? 'Проекты не найдены' : 'Нет сохранённых проектов'}</p>
          {!search && (
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
              Создать первый проект
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                  <Film size={18} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{project.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{project.width}×{project.height}</span>
                    <span className="text-[10px] text-gray-500">{formatDuration(project.duration)}</span>
                    {project.language && <span className="text-[10px] text-gray-500 uppercase bg-gray-800 px-1.5 py-0.5 rounded">{project.language}</span>}
                    <span className="text-[10px] text-gray-600 flex items-center gap-1">
                      <Clock size={9} />
                      {formatDate(project.updated_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  to={`/?project=${project.id}`}
                  className="flex items-center gap-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <ExternalLink size={12} />
                  Открыть
                </Link>
                <button
                  onClick={() => handleDelete(project.id, project.name)}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Удалить проект"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
