import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Menu, X, LayoutDashboard, FolderOpen, Settings, Clock, Film,
  Key, Globe, Eye, EyeOff, Save, Check, AlertCircle, ChevronRight, Trash2,
} from 'lucide-react';
import { API_URL } from '../api/client';

const Sidebar = memo(({ isOpen, onToggle, onOpenProject, onDeleteProject, currentProjectId }) => {
  const [activeSection, setActiveSection] = useState('projects');
  const [projects, setProjects] = useState([]);
  const [totalProjects, setTotalProjects] = useState(0);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    anthropic_api_key: '',
    openai_api_key: '',
    default_language: 'auto',
    default_preset: 'inventing.french',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showKeys, setShowKeys] = useState({});
  const [, setLoadingSettings] = useState(false);

  // Load projects
  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch(`${API_URL}/projects?limit=20`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setTotalProjects(data.total || 0);
      }
    } catch {
      // Network errors silently ignored — projects list remains empty
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  // Load settings
  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await fetch(`${API_URL}/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch {
      // Network errors silently ignored — settings remain at defaults
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeSection === 'projects') fetchProjects();
      if (activeSection === 'settings') fetchSettings();
    }
  }, [isOpen, activeSection, fetchProjects, fetchSettings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDeleteProject = useCallback(async (e, projectId) => {
    e.stopPropagation();
    if (confirmDeleteId !== projectId) {
      setConfirmDeleteId(projectId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    setDeletingId(projectId);
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        setTotalProjects(prev => prev - 1);
        if (onDeleteProject && currentProjectId === projectId) {
          onDeleteProject();
        }
      }
    } catch {
      // Network errors silently ignored — UI resets to non-deleting state
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, onDeleteProject, currentProjectId]);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col bg-gray-900 border-r border-gray-800 w-72 shrink-0 h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-800">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Профиль</span>
        <button
          onClick={onToggle}
          className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          aria-label="Закрыть меню"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveSection('projects')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeSection === 'projects'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <FolderOpen size={13} />
          Проекты
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
            activeSection === 'settings'
              ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/5'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Settings size={13} />
          Настройки
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSection === 'projects' && (
          <div>
            <div className="p-3 border-b border-gray-800/50">
              <span className="text-[10px] text-gray-500">Всего: {totalProjects}</span>
            </div>
            {loadingProjects ? (
              <div className="p-6 text-center text-gray-500 text-xs">Загрузка...</div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-center">
                <Film size={24} className="text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">Нет проектов</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => onOpenProject(project.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-800/50 transition-colors text-left group cursor-pointer"
                  >
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                      <Film size={12} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-300 truncate group-hover:text-white">{project.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-gray-600">{formatDuration(project.duration)}</span>
                        {project.language && <span className="text-[9px] text-gray-600 uppercase">{project.language}</span>}
                        <span className="text-[9px] text-gray-600">{formatDate(project.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteProject(e, project.id)}
                      disabled={deletingId === project.id}
                      className={`p-1.5 rounded shrink-0 transition-all ${
                        confirmDeleteId === project.id
                          ? 'bg-red-600 text-white'
                          : 'text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100'
                      } disabled:opacity-50`}
                      title={confirmDeleteId === project.id ? 'Нажмите ещё раз для удаления' : 'Удалить проект'}
                      aria-label="Удалить проект"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="p-3 space-y-4">
            {/* API Keys */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Key size={12} className="text-yellow-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">API Ключи</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Anthropic (Claude)</label>
                  <div className="flex gap-1">
                    <input
                      type={showKeys.anthropic ? 'text' : 'password'}
                      value={settings.anthropic_api_key || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, anthropic_api_key: e.target.value }))}
                      placeholder="sk-ant-..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white placeholder-gray-600 outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, anthropic: !prev.anthropic }))}
                      className="p-1 text-gray-500 hover:text-white bg-gray-800 border border-gray-700 rounded transition-colors"
                    >
                      {showKeys.anthropic ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">OpenAI (Whisper)</label>
                  <div className="flex gap-1">
                    <input
                      type={showKeys.openai ? 'text' : 'password'}
                      value={settings.openai_api_key || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, openai_api_key: e.target.value }))}
                      placeholder="sk-..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white placeholder-gray-600 outline-none focus:border-indigo-500 font-mono"
                    />
                    <button
                      onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                      className="p-1 text-gray-500 hover:text-white bg-gray-800 border border-gray-700 rounded transition-colors"
                    >
                      {showKeys.openai ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Globe size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Предпочтения</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Язык по умолчанию</label>
                  <select
                    value={settings.default_language || 'auto'}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_language: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500"
                  >
                    <option value="auto">Авто-определение</option>
                    <option value="ru">Русский</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="it">Italiano</option>
                    <option value="pt">Português</option>
                    <option value="zh">中文</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="ar">العربية</option>
                    <option value="hi">हिन्दी</option>
                    <option value="tr">Türkçe</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Пресет по умолчанию</label>
                  <select
                    value={settings.default_preset || 'inventing.french'}
                    onChange={(e) => setSettings(prev => ({ ...prev, default_preset: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500"
                  >
                    <option value="inventing.french">inventing.french</option>
                    <option value="french.super">french.super</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                saveError
                  ? 'bg-red-600 text-white'
                  : saved
                    ? 'bg-green-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {saveError ? <AlertCircle size={13} /> : saved ? <Check size={13} /> : <Save size={13} />}
              {saveError ? 'Ошибка' : saved ? 'Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
            </button>

            <p className="text-[9px] text-gray-600 italic">
              Reels Subtitle Generator v1.0
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
