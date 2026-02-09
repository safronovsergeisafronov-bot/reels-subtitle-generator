import React, { useEffect, useState } from 'react';
import { Save, Key, Globe, Eye, EyeOff, Check } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const Settings = () => {
  const [settings, setSettings] = useState({
    anthropic_api_key: '',
    openai_api_key: '',
    default_language: 'auto',
    default_preset: 'inventing.french',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const maskKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••' + key.slice(-4);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Загрузка...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Настройки</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* API Keys */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-yellow-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">API Ключи</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">Подключите AI-сервисы для обработки субтитров</p>
        </div>
        <div className="p-4 space-y-4">
          {/* Anthropic */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Anthropic API Key (Claude)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeys.anthropic ? 'text' : 'password'}
                  value={settings.anthropic_api_key || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, anthropic_api_key: e.target.value }))}
                  placeholder="sk-ant-..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>
              <button
                onClick={() => toggleShowKey('anthropic')}
                className="p-2 text-gray-500 hover:text-white bg-gray-800 border border-gray-700 rounded-lg transition-colors"
              >
                {showKeys.anthropic ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Используется для AI-коррекции текста субтитров</p>
          </div>

          {/* OpenAI */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">OpenAI API Key (Whisper)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKeys.openai ? 'text' : 'password'}
                  value={settings.openai_api_key || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, openai_api_key: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors font-mono"
                />
              </div>
              <button
                onClick={() => toggleShowKey('openai')}
                className="p-2 text-gray-500 hover:text-white bg-gray-800 border border-gray-700 rounded-lg transition-colors"
              >
                {showKeys.openai ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">Используется для распознавания речи (ASR)</p>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl mb-6">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Предпочтения</h2>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Язык по умолчанию</label>
            <select
              value={settings.default_language || 'auto'}
              onChange={(e) => setSettings(prev => ({ ...prev, default_language: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
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
            <label className="block text-xs text-gray-400 mb-1.5">Пресет стиля по умолчанию</label>
            <select
              value={settings.default_preset || 'inventing.french'}
              onChange={(e) => setSettings(prev => ({ ...prev, default_preset: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="inventing.french">inventing.french</option>
              <option value="french.super">french.super</option>
            </select>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4">
          <p className="text-xs text-gray-500">Reels Subtitle Generator v1.0</p>
          <p className="text-[10px] text-gray-600 mt-1">FastAPI + Whisper ASR + Claude AI + FFmpeg</p>
        </div>
      </section>
    </div>
  );
};

export default Settings;
