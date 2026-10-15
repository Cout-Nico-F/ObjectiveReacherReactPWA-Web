import React from 'react';

export type LanguageOption = 'es' | 'en' | 'pt';

interface SidebarProps {
  currentLanguage: LanguageOption;
  onSelectLanguage: (lang: LanguageOption) => void;
  t: Record<string, any>;
  activeNav: string;
  setActiveNav: (key: string) => void;
  setIsNavigationOpen: (open: boolean) => void;
  setIsHistoryOpen: (open: boolean) => void;
  highlightSection: (key: string, ref: any) => void;
  openAndScrollToAsmrSanctuary: () => void;
  openIndieShop: (tab?: any) => void;
  refs: {
    objectiveRef: any;
    entriesRef: any;
    statsRef: any;
    achievementsRef: any;
    settingsRef: any;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentLanguage,
  onSelectLanguage,
  t,
  activeNav,
  setActiveNav,
  setIsNavigationOpen,
  setIsHistoryOpen,
  highlightSection,
  openAndScrollToAsmrSanctuary,
  openIndieShop,
  refs,
}) => {
  const navItems = [
    {
      key: 'objective',
      label: t.navObjective,
      action: () => highlightSection('objective', refs.objectiveRef),
    },
    {
      key: 'entries',
      label: `＋   ${t.registerProgress}`,
      action: () => highlightSection('entries', refs.entriesRef),
    },
    {
      key: 'history',
      label: `▤   ${t.historyTitle}`,
      action: () => {
        setActiveNav('history');
        setIsNavigationOpen(false);
        if (window.innerWidth < 1024) {
          setIsHistoryOpen(true);
        } else {
          highlightSection('entries', refs.entriesRef);
        }
      },
    },
    {
      key: 'stats',
      label: t.navStats,
      action: () => highlightSection('stats', refs.statsRef),
    },
    {
      key: 'achievements',
      label: t.navAchievements,
      action: () => highlightSection('achievements', refs.achievementsRef),
    },
    {
      key: 'asmr_clicker',
      label: t.navAsmr,
      action: () => openAndScrollToAsmrSanctuary(),
    },
    {
      key: 'indie_shop',
      label: t.navSanctuary,
      action: () => openIndieShop('skins'),
    },
    {
      key: 'settings',
      label: `⚙   ${t.objectiveSettings}`,
      action: () => highlightSection('settings', refs.settingsRef),
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {/* Selector de Idioma Integrado */}
      <div className="bg-[#1A1829] border border-white/10 rounded-[14px] p-2 flex items-center justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#A599C2] pl-1">🌐 Idioma</span>
        <div className="flex bg-[#12101D] rounded-[10px] p-1 gap-1 border border-white/5">
          {(['es', 'en', 'pt'] as const).map((lang) => {
            const isSelected = currentLanguage === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onSelectLanguage(lang)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-extrabold uppercase transition-all ${
                  isSelected
                    ? 'bg-[#FFD54F] text-[#12101D] shadow-md scale-105'
                    : 'text-[#8E82A8] hover:text-[#F4F1FF] hover:bg-white/5'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menú de Navegación Original */}
      <nav className="grid grid-cols-1 max-[920px]:landscape:grid-cols-2 gap-1.5">
        {navItems.map((item) => {
          const isSelected = activeNav === item.key;
          return (
            <button
              key={item.key}
              onClick={item.action}
              className={`w-full h-[42px] sm:h-[48px] px-3.5 rounded-[12px] text-left font-medium text-[13px] sm:text-sm transition flex items-center truncate ${
                isSelected
                  ? 'bg-[#302747] text-[#E6D9FF]'
                  : 'bg-transparent text-[#F4F1FF] hover:bg-[#242238]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};