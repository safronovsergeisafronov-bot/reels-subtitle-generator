import React from 'react';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'auto', name: 'Auto-detect', flag: '' },
  { code: 'en', name: 'English', flag: '' },
  { code: 'ru', name: 'Russian', flag: '' },
  { code: 'es', name: 'Spanish', flag: '' },
  { code: 'fr', name: 'French', flag: '' },
  { code: 'de', name: 'German', flag: '' },
  { code: 'pt', name: 'Portuguese', flag: '' },
  { code: 'it', name: 'Italian', flag: '' },
  { code: 'ja', name: 'Japanese', flag: '' },
  { code: 'ko', name: 'Korean', flag: '' },
  { code: 'zh', name: 'Chinese', flag: '' },
  { code: 'ar', name: 'Arabic', flag: '' },
  { code: 'hi', name: 'Hindi', flag: '' },
];

const LanguageSelector = ({ value = 'auto', onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <Globe size={14} className="text-zinc-400 flex-shrink-0" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name} {lang.code !== 'auto' ? `(${lang.code})` : ''}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
