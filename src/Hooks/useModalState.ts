import { useState } from 'react';

export function useModalState() {
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isBannerPickerOpen, setIsBannerPickerOpen] = useState<boolean>(false);
  const [isAllAchievementsOpen, setIsAllAchievementsOpen] = useState<boolean>(false);
  const [isMascotGalleryOpen, setIsMascotGalleryOpen] = useState<boolean>(false);
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState<boolean>(false);
  const [isIndieShopOpen, setIsIndieShopOpen] = useState<boolean>(false);
  const [isDailyRitualOpen, setIsDailyRitualOpen] = useState<boolean>(false);
  const [isAsmrSanctuaryOpen, setIsAsmrSanctuaryOpen] = useState<boolean>(false);
  const [mascotGalleryStartLevel, setMascotGalleryStartLevel] = useState<number | null>(null);
  const [indieShopInitialTab, setIndieShopInitialTab] = useState<
    'skins' | 'cards_audio' | 'buffs' | 'support'
  >('skins');

  return {
    modals: {
      isEditorOpen,
      isBannerPickerOpen,
      isAllAchievementsOpen,
      isMascotGalleryOpen,
      isArchivedModalOpen,
      isIndieShopOpen,
      isDailyRitualOpen,
      isAsmrSanctuaryOpen,
      mascotGalleryStartLevel,
      indieShopInitialTab,
    },
    actions: {
      setIsEditorOpen,
      setIsBannerPickerOpen,
      setIsAllAchievementsOpen,
      setIsMascotGalleryOpen,
      setIsArchivedModalOpen,
      setIsIndieShopOpen,
      setIsDailyRitualOpen,
      setIsAsmrSanctuaryOpen,
      setMascotGalleryStartLevel,
      setIndieShopInitialTab,
    }
  };
}
