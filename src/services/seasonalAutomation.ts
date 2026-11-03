import { IdeaItem, DomainType } from '../types';
import { saveIdeaToFirebase } from './storage';
import { runAutomatedPipeline } from './pipelineEngine';

export interface SeasonalEventItem {
  id: string;
  name: string;
  month: string;
  eventDate: string; // YYYY-MM-DD
  icon: string;
  description: string;
  bestSellers: string[];
  historicalVolume: string;
  defaultDomain?: DomainType;
}

export const US_SEASONAL_EVENTS: SeasonalEventItem[] = [
  {
    id: 'val',
    name: "Valentine's Day (Sevgililer Günü)",
    month: 'Şubat',
    eventDate: '2027-02-14',
    icon: '❤️',
    description: 'Yılın en yüksek duygusal satın alma ve romantik kişiselleştirilmiş hediye dönemi.',
    bestSellers: ['"The Night We Met" Yıldız Haritası', 'İlk Dans Şarkısı Spotify Plaket', 'Çift Yemini & Tarihli Minimalist Tipografi'],
    historicalVolume: '140K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'stp',
    name: "St. Patrick's Day",
    month: 'Mart',
    eventDate: '2027-03-17',
    icon: '☘️',
    description: 'İrlanda mirası, vintage yeşil tonlu illüstrasyonlar ve espri içeren grafik giyim/poster talebi.',
    bestSellers: ['Vintage İrlanda Haritası & Kelt Sembolleri', 'Yeşil Minimalist Botanik Duvar Sanatı', 'İrlanda Bira & Pub Patent Çizimi'],
    historicalVolume: '65K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'mom',
    name: "Mother's Day (Anneler Günü)",
    month: 'Mayıs',
    eventDate: '2027-05-09',
    icon: '🌸',
    description: 'Etsy nin en büyük 2. hediyeleşme sezonu. Aile ve çocuk temalı ürünlerde conversion patlaması.',
    bestSellers: ['Doğum Ayı Çiçek Buketi (Birth Month Flower)', 'Anne ve Çocuklar İllüstrasyon Portresi', 'Büyükanne İçin Torun İsimli Bahçe Posteri'],
    historicalVolume: '210K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'dad',
    name: "Father's Day (Babalar Günü)",
    month: 'Haziran',
    eventDate: '2026-06-21',
    icon: '🛠️',
    description: 'Erkek odası (man cave), garaj dekoru, araba blueprint ve balıkçılık temaları.',
    bestSellers: ['Babanın Arabası Özel Silüet & Spec Posteri', 'Vintage Olta & Kamp Patent Çizimleri', 'Baba & Çocuk Nostaljik Çizgi Çizimi'],
    historicalVolume: '130K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'july4',
    name: "4th of July (Bağımsızlık Günü)",
    month: 'Temmuz',
    eventDate: '2026-07-04',
    icon: '🎆',
    description: 'Amerikan nostaljisi, vintage vatanseverlik ve yazlık ev/veranda dekorasyonu.',
    bestSellers: ['Vintage Amerikan Bayrağı & Harita Reprodüksiyonu', 'Bağımsızlık Bildirgesi Eskitme Parşömen', 'Amerikan Klasik Araba & Kasaba Posteri'],
    historicalVolume: '85K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'hall',
    name: "Halloween (Cadılar Bayramı)",
    month: 'Ekim',
    eventDate: '2026-10-31',
    icon: '🎃',
    description: 'Gothic sanat, büyücülük (witchy), vintage botanik ve çocuk odası sevimli hayalet konseptleri.',
    bestSellers: ['Vintage Gothic Karga & İskelet Çizimi', 'Sevimli Hayaletli Çocuk Odası Baskısı', 'Balkabağı Tarlası Yağlıboya Reprodüksiyonu'],
    historicalVolume: '280K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'thx',
    name: "Thanksgiving (Şükran Günü)",
    month: 'Kasım',
    eventDate: '2026-11-26',
    icon: '🦃',
    description: 'Sonbahar mutfak dekorasyonu, şükran/aile sofrası posterleri ve sıcak toprak renkleri.',
    bestSellers: ['Sonbahar Yapraklı Aile Soyadı Posteri', 'Minimalist "Give Thanks" Tipografisi', 'Rustik Çiftlik Evi Mutfak Sanatı'],
    historicalVolume: '110K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'xmas',
    name: "Christmas & Holiday Season (Noel)",
    month: 'Aralık',
    eventDate: '2026-12-25',
    icon: '🎄',
    description: 'Etsy de yılın en çılgın satış dönemi. Mağaza cirosunun %40 ı bu 2 ayda gerçekleşir.',
    bestSellers: ['İlk Ev Noel Süsü Posteri (First Home Christmas)', 'Nostaljik Karlı Çam Ormanı Tablosu', 'Aile Soyadı Noel Şarkı Sözleri'],
    historicalVolume: '450K+ Aylık Arama Hacmi',
    defaultDomain: 'etsy_pod'
  },
  {
    id: 'superbowl',
    name: "Super Bowl (YouTube & Sports)",
    month: 'Şubat',
    eventDate: '2027-02-07',
    icon: '🏈',
    description: 'YouTube spor otomasyonu ve Etsy parti dekorasyonu için devasa trafik dönemi.',
    bestSellers: ['Spor Analiz Videoları (YouTube)', 'Super Bowl Parti Oyunları (Etsy)', 'NFL Nostalji Patent Çizimleri'],
    historicalVolume: '1M+ Video İzlenme Potansiyeli',
    defaultDomain: 'youtube_automation'
  },
  {
    id: 'apple_event',
    name: "Apple/Tech Event (AI & Apps)",
    month: 'Eylül',
    eventDate: '2026-09-10',
    icon: '🍎',
    description: 'Yeni teknoloji lansmanları. YouTube teknoloji kanalları ve AI uygulama projeleri için kritik.',
    bestSellers: ['Yeni Özellik İnceleme Videoları', 'iOS Widget & Wallpaper Paketleri', 'AI Verimlilik Araçları'],
    historicalVolume: 'Tech Trend Patlaması',
    defaultDomain: 'ai_apps'
  }
];

export const checkAndRunSeasonalAutomation = async (
  userId: string,
  existingIdeas: IdeaItem[],
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void
) => {
  const now = new Date();

  for (const evt of US_SEASONAL_EVENTS) {
    const eventDateObj = new Date(evt.eventDate);
    const diffMs = eventDateObj.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Check if event is within 60 days (2 months) and not in the past
    if (diffDays <= 65 && diffDays > 0) {
      const alreadyCreated = existingIdeas.some(i => 
        i.title.toLowerCase().includes(evt.name.toLowerCase().slice(0, 10)) ||
        i.tags.includes(evt.id) ||
        (i.rawInput && i.rawInput.toLowerCase().includes(evt.id))
      );

      if (!alreadyCreated) {
        const domain: DomainType = evt.defaultDomain || 'etsy_pod';
        const topBestseller = evt.bestSellers[0] || evt.name;
        const newId = `idea-seasonal-${evt.id}-${Date.now()}`;
        
        const seasonalIdea: IdeaItem = {
          id: newId,
          title: `${evt.name} — ${topBestseller}`,
          rawInput: `Sezonsal Takvim Otomasyonu: ${evt.name} etkinliğine ${diffDays} gün kaldı (2 ay öncesi stratejik lansman). Önerilen Bestseller konsepti: ${topBestseller}. ${evt.description}`,
          domain,
          status: 'inbox',
          priority: 'high',
          tags: [evt.id, 'seasonal', 'auto-generated', domain],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          seasonalCountdown: {
            eventName: evt.name,
            eventDate: evt.eventDate,
            targetLaunchDate: new Date(eventDateObj.getTime() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            startResearchDate: new Date(eventDateObj.getTime() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            startDesignDate: new Date(eventDateObj.getTime() - 75 * 24 * 3600 * 1000).toISOString().slice(0, 10),
            daysUntilDeadline: diffDays,
            proactiveIdea: topBestseller,
            urgencyStatus: diffDays <= 20 ? 'urgent' : 'upcoming'
          }
        };

        onToast?.(`📅 Sezonsal Takvim Otomasyonu: ${evt.name} için proje otomatik oluşturuldu!`, 'info');
        await saveIdeaToFirebase(userId, seasonalIdea);

        // Run full automated pipeline for this seasonal idea background
        runAutomatedPipeline({
          userId,
          idea: seasonalIdea,
          allIdeasPool: existingIdeas,
          onToast
        });
      }
    }
  }
};
