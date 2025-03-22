/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';

interface Language {
  name: string;
  percentage: string;
  bytes: number;
  color: string;
}

interface LanguageStatsProps {
  repoOwner: string;
  repoName: string;
}

export default function LanguageStats({ repoOwner, repoName }: LanguageStatsProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch(`/api/languages?owner=${repoOwner}&repo=${repoName}`);
        if (!response.ok) {
          throw new Error('Failed to fetch language data');
        }
        const data = await response.json();
        setLanguages(data);
      } catch (err) {
        setError('Failed to load language statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchLanguages();
  }, [repoOwner, repoName]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-3">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-3 text-xs">
        {error}
      </div>
    );
  }

  if (languages.length === 0) {
    return (
      <div className="text-gray-500 p-3 text-xs">
        No language statistics available
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-semibold mb-2">Language Distribution</h3>
      
      {/* Language Bar */}
      <div className="h-4 flex rounded-full overflow-hidden">
        {languages.map((lang, index) => (
          <div
            key={lang.name}
            style={{
              width: `${lang.percentage}%`,
              backgroundColor: lang.color,
            }}
            className="transition-all duration-300"
            title={`${lang.name}: ${lang.percentage}%`}
          />
        ))}
      </div>

      {/* Language Legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {languages.map((lang) => (
          <div key={lang.name} className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: lang.color }}
            />
            <span className="text-xs">
              {lang.name} ({lang.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}