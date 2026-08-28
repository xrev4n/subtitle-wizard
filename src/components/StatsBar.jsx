import { useTranslation } from '../context/I18nContext';
import { calculateStats } from '../utils/srtParser';
import { Layers, Clock, Type, AlignLeft, Timer } from 'lucide-react';

export default function StatsBar({ subtitles = [] }) {
  const { t } = useTranslation();

  if (!subtitles || subtitles.length === 0) {
    return null;
  }

  const stats = calculateStats(subtitles);

  const statItems = [
    {
      id: 'blocks',
      label: t('parser.stats.totalBlocks'),
      value: stats.totalBlocks.toLocaleString(),
      icon: Layers,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
    },
    {
      id: 'duration',
      label: t('parser.stats.totalDuration'),
      value: stats.formattedDuration,
      icon: Clock,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      id: 'characters',
      label: t('parser.stats.totalCharacters'),
      value: stats.totalCharacters.toLocaleString(),
      icon: Type,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      id: 'words',
      label: t('parser.stats.totalWords'),
      value: stats.totalWords.toLocaleString(),
      icon: AlignLeft,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      id: 'avgDuration',
      label: t('parser.stats.avgDuration'),
      value: stats.formattedAvgDuration,
      icon: Timer,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {statItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <div
            key={item.id}
            className="glass-card rounded-xl p-4 border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400 font-medium line-clamp-1">
                {item.label}
              </span>
              <div className={`p-1.5 rounded-lg ${item.bg} border ${item.border} ${item.color} group-hover:scale-105 transition-transform`}>
                <IconComponent className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
                {item.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
