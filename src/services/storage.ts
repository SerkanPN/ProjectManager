import { IdeaItem, DomainType, StatusType, MaturityScoreBreakdown } from '../types';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'omnifocus_ideas_v4';

export const calculateMaturityScore = (idea: IdeaItem): MaturityScoreBreakdown => {
  let score = 0;
  const breakdown: MaturityScoreBreakdown = {
    score: 0,
    isReadyToPublish: false,
    researchDone: !!(idea.groundedResearch || idea.dataComparison),
    listingDraftDone: !!idea.etsyListing,
    visualConceptsDone: !!(idea.visualConcepts && idea.visualConcepts.length >= 10),
    designBriefDone: !!idea.designBrief,
    subIdeasDone: !!(idea.subIdeas && idea.subIdeas.length > 0),
  };

  if (breakdown.researchDone) score += 20;
  if (breakdown.listingDraftDone) score += 25;
  if (breakdown.visualConceptsDone) score += 25;
  if (breakdown.designBriefDone) score += 15;
  if (breakdown.subIdeasDone) score += 15;

  breakdown.score = score;
  breakdown.isReadyToPublish = score >= 100;
  return breakdown;
};

// -------------------------------------------------------------
// 21 REAL USER PROJECTS (EXACT USER SPECIFIED LIST)
// -------------------------------------------------------------
export const REAL_USER_PROJECTS: IdeaItem[] = [
  // --- 17 ETSY PRODUCTS ---
  {
    id: 'etsy-01',
    title: 'Etsy Affirmation Poster-Calendar',
    rawInput: 'Affirmation, motivational, inspirational posterler tasarlanır. Örnek fikir olarak geçmiş yıla ait 12 adet başarı-mutluluk anlarının fotoğrafları ile takvim yapılır. Ya da her ay için bir görselle takvim yapılır. Bunun gibi fikirler için yapay zekadan destek alınır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['etsy pod', 'affirmation', 'poster calendar', 'motivational', 'custom photo calendar'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Kişisel gelişim, motivasyon ve geçmiş yılın 12 başarı anını fotoğraflarla takvime dönüştüren özel poster takvim koleksiyonu.',
      tags: ['affirmation poster', 'motivational calendar', 'custom photo calendar'],
      domainSpecifics: {
        niche: 'Motivasyon & Kişiselleştirilmiş Takvim',
        productType: '12 Aylık Duvar & Masa Takvim Posteri (A3/A2)',
        targetAudience: 'Kişisel gelişim meraklıları, hediye arayanlar ve planlama tutkunları',
        tags: ['affirmation poster', 'motivational calendar', 'custom photo calendar', 'inspirational print'],
        designConcept: 'Minimalist tipografi, pozitif olumlama sözleri ve estetik fotoğraf çerçeveleri.',
        competitionInsight: '12 aylık anı fotoğrafı yükleme bağlantısı sunarak rakiplerden ayrışın.'
      },
      checklist: [
        { id: 'c1', text: '12 ay için AI olumlama sözleri ve tipografi şablonu üret', done: false, tool: 'Canva', priority: 'high' },
        { id: 'c2', text: 'Printify takvim & poster mockup örneklerini hazırla', done: false, tool: 'Printify', priority: 'high' },
        { id: 'c3', text: '13 Etsy arama etiketini ekle ve yayınla', done: false, tool: 'Etsy', priority: 'medium' }
      ],
      strategicNotes: 'Yılbaşı ve yeni yıl başlangıcı dönemlerinde yüksek arama hacmine sahiptir.',
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-02',
    title: 'Kisisellestirilmis poster',
    rawInput: 'Kişilerin kendi vereceği sözler veya fotoğraflardan bir poster tasarımı. Custom Poster başlığıyla satılır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'custom poster', 'personalized print', 'custom quote'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Kullanıcının kendi kişisel sözleri, evlilik yeminleri veya fotoğraflarından hazırlanan "Custom Poster" ürünü.',
      tags: ['custom poster', 'personalized quote print', 'custom photo text'],
      domainSpecifics: {
        niche: 'Kişiselleştirilmiş Söz & Fotoğraf Duvar Sanatı',
        productType: 'Çerçeveli Mat Poster & Dijital İndirme',
        targetAudience: 'Yıldönümü, doğum günü ve ev hediyesi arayan müşteriler'
      },
      checklist: [
        { id: 'c4', text: 'Kişiselleştirilebilir metin & fotoğraf şablonunu oluştur', done: false, tool: 'Canva', priority: 'high' },
        { id: 'c5', text: 'Etsy listing ve sipariş otomasyon linkini ayarla', done: false, tool: 'Etsy', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-03',
    title: 'World Cup 2026',
    rawInput: 'World Cup 2026 temalı ürünler: 1- Oyuncu kartları, 2- Takım posterleri, 3- Fixture, 4- İkonik gol sevinçleri, 5- vs...',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'world cup 2026', 'football poster', 'player cards', 'fixture print'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: '2026 Dünya Kupası koleksiyonu: Oyuncu kartları, takım posterleri, maç fikstürü ve ikonik gol sevinçleri baskıları.',
      tags: ['world cup 2026', 'soccer wall art', 'football player card print'],
      domainSpecifics: {
        niche: 'Futbol & Spor Koleksiyonu Dekorasyonu',
        productType: 'A3 Fikstür Posteri, Kart Setleri ve Kanvas Tablo'
      },
      checklist: [
        { id: 'c6', text: '2026 Dünya kupası maç fikstürü vektör çizimini yap', done: false, tool: 'Figma', priority: 'high' },
        { id: 'c7', text: 'Efsane gol sevinçleri için illüstrasyon ürettir', done: false, tool: 'Midjourney', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-04',
    title: 'Spotify poster',
    rawInput: 'Spotify temalı song poster. Custom Songs Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı şarkısını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'spotify poster', 'custom songs poster', 'scannable music art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Sipariş maillerine otomatik link gönderen, kullanıcının şarkısını aratıp bularak kendi posterini tasarlamasını sağlayan dinamik Spotify posteri.',
      tags: ['custom spotify poster', 'scannable song print', 'music plaque'],
      domainSpecifics: {
        niche: 'Müzik & Kişiselleştirilmiş Akrilik/Poster',
        productType: 'Akrilik Cam / Mat Baskı / Dijital İndirme'
      },
      checklist: [
        { id: 'c8', text: 'Arama ve poster oluşturma web link arayüzünü entegre et', done: false, tool: 'Cursor', priority: 'high' },
        { id: 'c9', text: 'Etsy mesajlaşma otomasyon şablonunu ayarla', done: false, tool: 'Etsy', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-05',
    title: 'Album Cover Poster',
    rawInput: 'Custom Album Cover Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı albümünü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'album cover poster', 'custom album print', 'music wall art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Kullanıcının albümünü aratıp kişiselleştirdiği web otomasyonlu Custom Album Cover Poster projesi.',
      tags: ['custom album cover', 'music room decor', 'album receipt art'],
      domainSpecifics: {
        niche: 'Albüm Kapakları & Müzik Duvar Sanatı',
        productType: '18x24 Mat Poster & Galeri Baskı'
      },
      checklist: [
        { id: 'c10', text: 'Albüm kapak jeneratör modülünü test et', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-06',
    title: 'Movie Poster',
    rawInput: 'Custom Movie-Series Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı filmini veya dizisini aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'movie poster', 'custom series poster', 'cinema wall art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Film ve dizi severler için web arama entegrasyonlu Custom Movie-Series Poster.',
      tags: ['custom movie poster', 'tv series wall print', 'cinema room decor'],
      domainSpecifics: {
        niche: 'Sinema & Dizi Duvar Sanatı',
        productType: 'Arşivlik Mat Kağıt Baskı'
      },
      checklist: [
        { id: 'c11', text: 'TMDB API film/dizi arama entegrasyonunu doğrula', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-07',
    title: 'Space Theme Poster',
    rawInput: 'Custom Space Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı yıldızını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['etsy pod', 'space theme poster', 'custom star map', 'constellation art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Özel gece gökyüzü, yıldızlar ve gezegen takımyıldızlarını kişiselleştiren Custom Space Poster.',
      tags: ['space poster', 'custom star chart', 'astronomy wall art'],
      domainSpecifics: {
        niche: 'Uzay & Astronomi Hediyeleri',
        productType: 'Koyu Lacivert & Siyah Baskılı Poster'
      },
      checklist: [
        { id: 'c12', text: 'Yıldız haritası jeneratörünü web linkine bağla', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-08',
    title: 'Mystical Poster',
    rawInput: 'Custom Mystic Poster olarak tanımlanır. Mystic temalı onlarca poster üretecek bir uygulama yapılır, bu sayede binlerce otomatik ürün yaratılır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['etsy pod', 'mystical poster', 'tarot art', 'astrology print', 'automation app'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Mistik, tarot ve astroloji temalı binlerce otomatik poster üreten uygulama destekli koleksiyon.',
      tags: ['mystic wall art', 'tarot poster generator', 'astrology decor'],
      domainSpecifics: {
        niche: 'Mistik & Astroloji Duvar Dekorasyonu',
        productType: 'Otomatik Toplu Poster Tasarımı & Dijital Download'
      },
      checklist: [
        { id: 'c13', text: 'Mistik şablon ve tarot görsel kütüphanesini hazırla', done: false, tool: 'Midjourney', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-09',
    title: 'Stoaic Poster',
    rawInput: 'Custom Stoaic Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı filozofu ve sözünü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'stoaic poster', 'stoicism', 'marcus aurelius', 'philosophy print'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Marcus Aurelius, Seneca gibi Stoacı filozofların sözlerini ve heykellerini içeren Custom Stoaic Poster.',
      tags: ['stoic quote poster', 'philosophy wall art', 'memento mori print'],
      domainSpecifics: {
        niche: 'Felsefe & Çalışma Odası Motivasyon Dekorasyonu',
        productType: 'Siyah Beyaz Sütun Heykel Baskısı'
      },
      checklist: [
        { id: 'c14', text: 'Stoacı filozof ve söz veri tabanını entegre et', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-10',
    title: 'Custom Car Poster',
    rawInput: 'Custom Car Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı arabasını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'custom car poster', 'automobile print', 'car silhouette', 'garage art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Araba tutkunları için araç marka, model ve teknik özelliklerini kişiselleştiren Custom Car Poster.',
      tags: ['custom car poster', 'car blueprint art', 'sports car print'],
      domainSpecifics: {
        niche: 'Otomobil & Garaj Dekorasyonu',
        productType: 'Yüksek Çözünürlüklü Vektör Baskı'
      },
      checklist: [
        { id: 'c15', text: 'Araba marka/model arama web servisini bağla', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-11',
    title: 'Patent poster',
    rawInput: 'Custom Patent Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı ürününü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['etsy pod', 'patent poster', 'vintage patent print', 'blueprint art'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Tarihi icatların ve ürünlerin teknik patent çizimlerini kişiselleştiren Custom Patent Poster.',
      tags: ['custom patent poster', 'vintage blueprint', 'inventor wall decor'],
      domainSpecifics: {
        niche: 'Tarihi İcatlar & Retro Ofis Sanatı',
        productType: 'Eski Kağıt Dokulu & Chalkboard Stil Poster'
      },
      checklist: [
        { id: 'c16', text: 'Patent arama API entegrasyonunu tamamla', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-12',
    title: 'Ressam Collection',
    rawInput: 'Ünlü ressamların tüm resimlerinin dijital versiyonlarının koleksiyonu.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'famous painters', 'fine art prints', 'digital art collection', 'museum print'],
    createdAt: '2026-05-04T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Van Gogh, Monet, Klimt gibi dünyaca ünlü ressamların eserlerinden oluşan dev dijital sanat koleksiyonu.',
      tags: ['fine art print set', 'classic art gallery', 'famous painter collection'],
      domainSpecifics: {
        niche: 'Klasik Sanat & Müze Galeri Baskıları',
        productType: '300 DPI Yüksek Çözünürlüklü Dijital Set'
      },
      checklist: [
        { id: 'c17', text: 'Public domain müze yüksek çözünürlüklü tablolarını indirip düzenle', done: false, tool: 'Figma', priority: 'high' }
      ],
      generatedAt: '2026-05-04T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-13',
    title: 'YouTube Play Buttom',
    rawInput: 'YouTube playbutton posteri için html, foamboard play button, foamboard play button ledli, alüminyum yekpare.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'youtube play button', 'creator award', 'foamboard led', 'custom plaque'],
    createdAt: '2026-05-05T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'İçerik üreticileri için HTML poster, foamboard LED ışıklı ve yekpare alüminyum YouTube Play Button plaketi.',
      tags: ['custom youtube play button', 'creator plaque', 'led play button award'],
      domainSpecifics: {
        niche: 'İçerik Üreticileri & YouTube Yayıncı Plaketleri',
        productType: 'Foamboard, LED Işıklı Plaket & Alüminyum Gövde'
      },
      checklist: [
        { id: 'c18', text: 'HTML & Vektör play button şablonunu çiz', done: false, tool: 'Figma', priority: 'high' },
        { id: 'c19', text: 'LEDli ve alüminyum üretim tedarikçilerini belirle', done: false, tool: 'Printify', priority: 'high' }
      ],
      generatedAt: '2026-05-05T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-14',
    title: 'Sehir Posterleri',
    rawInput: 'Sehir Posterleri. (Etiket: CITYPOSTER)',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'sehir posterleri', 'cityposter', 'city map print', 'travel decor'],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Dünyanın popüler şehirlerinin harita, koordinat ve minimalist illüstrasyon posterleri (CITYPOSTER etiketli).',
      tags: ['cityposter', 'custom city map', 'travel wall art'],
      domainSpecifics: {
        niche: 'Şehir Haritaları & Seyahat Dekorasyonu',
        productType: 'Minimalist Şehir Vektör Posteri'
      },
      checklist: [
        { id: 'c20', text: '50 popüler dünya şehri harita vektörünü derle', done: false, tool: 'Figma', priority: 'high' }
      ],
      generatedAt: '2026-06-24T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-15',
    title: 'Dini Poster',
    rawInput: 'Dini Poster, niche olarak hac şeklinde yazılmış dini sözler, ilahiler.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'dini poster', 'cross typography', 'hymn art', 'religious wall decor'],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Haç şeklinde tipografik olarak dizilmiş dini sözler, dualar ve ilahilerden oluşan özel dini duvar sanatı.',
      tags: ['christian wall art', 'cross shape typography', 'scripture print'],
      domainSpecifics: {
        niche: 'Dini & Manevi Duvar Sanatı',
        productType: 'Çerçeveli Tipografi Posteri & Kanvas'
      },
      checklist: [
        { id: 'c21', text: 'Haç biçiminde kelime dizim tipografi kalıbını tamamla', done: false, tool: 'Canva', priority: 'high' }
      ],
      generatedAt: '2026-06-24T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-16',
    title: 'Botanical Wallpaper',
    rawInput: 'Botanical Wallpaper.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'botanical wallpaper', 'peel and stick', 'nature mural', 'seamless pattern'],
    createdAt: '2026-06-24T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: false,
    maturityScore: 20,
    actionPlan: {
      summary: 'Ev içi duvar kaplama için tropikal yaprak, palmiye ve vintage botanik desenli yapışkanlı duvar kağıdı.',
      tags: ['botanical wallpaper', 'peel and stick wall mural', 'floral home decor'],
      domainSpecifics: {
        niche: 'Ev Dekorasyonu & Duvar Kağıdı',
        productType: 'Peel & Stick Sökülebilir Duvar Kağıdı Rulosu'
      },
      checklist: [
        { id: 'c22', text: 'Kesintisiz (seamless) botanik desen kalıplarını hazırla', done: false, tool: 'Midjourney', priority: 'high' }
      ],
      generatedAt: '2026-06-24T00:30:00.000Z'
    }
  },
  {
    id: 'etsy-17',
    title: 'movie ticket poser',
    rawInput: 'Movie ticket poster tasarımı. Sinema bileti hatırası ve film bileti konseptli poster tasarımı.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['etsy pod', 'movie ticket poster', 'vintage cinema stub', 'custom ticket print'],
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Sinema severler için tarih, koltuk no ve film adı özelleştirilebilir vintage sinema bileti şeklinde poster.',
      tags: ['movie ticket print', 'custom cinema stub art', 'film lovers gift'],
      domainSpecifics: {
        niche: 'Retro Sinema & Bilet Hatıraları',
        productType: '11x17 ve 18x24 Mat Poster'
      },
      checklist: [
        { id: 'c23', text: 'Nostaljik sinema bileti illüstrasyon şablonunu tamamla', done: false, tool: 'Figma', priority: 'high' }
      ],
      generatedAt: '2026-11-02T00:30:00.000Z'
    }
  },

  // --- 3 YOUTUBE PROJECTS ---
  {
    id: 'yt-01',
    title: 'Utanc Hikayeleri',
    rawInput: 'İnsanların utandığı hikayeleri anlatacak. “Su zaman şunu yapmıştım bu zaman bunu yapmıştım” gibi. Biraz Esra Erol tarzı şok edici şeyler olmalı. Tvlerde çıkan yüzü gösterilmeyen kompozisyonunda olacak.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['youtube automation', 'utanc hikayeleri', 'esra erol tarzi', 'faceless tv', 'shocking stories'],
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Yüzü gösterilmeyen, televizyon programı kompozisyonunda şok edici ve merak uyandırıcı utanç hikayeleri formatı.',
      tags: ['utanc hikayeleri', 'cringe anlar', 'gizli itiraflar'],
      domainSpecifics: {
        titleIdeas: [
          'O Gün Yaşadığım Şeyi Hayatım Boyunca Unutamayacağım...',
          'Stüdyodakiler Şok Oldu: Hiç Kimseye Anlatamadığı Utanç'
        ],
        first30sHook: '"Yüzümü göstermek istemiyorum çünkü anlatacaklarımı duyarsanız bir daha kimsenin yüzüne bakamam..."',
        automationWorkflow: {
          voiceover: 'ElevenLabs: Gizemli ve heyecanlı Türkçe ses tonu',
          visuals: 'TV stüdyosu gölge silüet görseli + dramatik B-roll'
        }
      },
      checklist: [
        { id: 'c24', text: 'Şok edici utanç hikayesi senaryosunu kaleme al', done: false, tool: 'Cursor', priority: 'high' },
        { id: 'c25', text: 'Gölge insan silüeti stüdyo kompozisyonunu CapCut ile kurgula', done: false, tool: 'CapCut', priority: 'high' }
      ],
      generatedAt: '2026-05-30T00:30:00.000Z'
    }
  },
  {
    id: 'yt-02',
    title: 'Itiraf ediyorum',
    rawInput: 'Çarpıcı itirafların yayınlandığı bir YouTube kanalı.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['youtube automation', 'itiraf ediyorum', 'confession channel', 'viral retention'],
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Çarpıcı, merak uyandırıcı ve yüksek izlenme tutunmalı anonim itiraf kanalı.',
      tags: ['itiraf ediyorum', 'gizli sir', 'viral youtube'],
      domainSpecifics: {
        titleIdeas: [
          'İtiraf Ediyorum: 5 Yıldır Herkesten Sakladığım Gerçek',
          'Bunu Söylemek Zorundayım...'
        ]
      },
      checklist: [
        { id: 'c26', text: 'Anonim itiraf toplama formunu ve seslendirmesini hazırla', done: false, tool: 'ElevenLabs', priority: 'high' }
      ],
      generatedAt: '2026-05-30T00:30:00.000Z'
    }
  },
  {
    id: 'yt-03',
    title: 'Sorgu odasi',
    rawInput: 'Bir karakolun sorgu odası konseptinde kurgusal cinayetler ve onları çözen dedektifler olacak. Birkaç farklı şüpheliyi sorguladıktan sonra çözecekler. Hatta çözmeyip izleyiciye soracaklar ve bir sonraki bölümde çözecekler.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['youtube automation', 'sorgu odasi', 'polisiye cinayet', 'katili sen bul', 'interactive crime'],
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Karakol sorgu odası konseptinde, şüphelilerin sorgulandığı ve cevabın izleyiciye bırakıldığı interaktif polisiye dizi.',
      tags: ['sorgu odasi', 'polisiye dizi', 'katil kim'],
      domainSpecifics: {
        titleIdeas: [
          'Sorgu Odası #1: Şüphelilerden Biri Yalan Söylüyor! Katil Kim?',
          'Cevabı Yorumlara Yazın: Katili Bir Sonraki Bölümde Açıklıyoruz!'
        ],
        first30sHook: '"Dedektif hoş geldin. Odadaki 3 şüpheliden biri cinayeti işledi. Çelişkiyi bulup katili tahmin edebilir misin?"'
      },
      checklist: [
        { id: 'c27', text: 'Sorgu odası senaryosu ve 3 şüpheli çelişkisini kurgula', done: false, tool: 'Cursor', priority: 'high' },
        { id: 'c28', text: 'Dedektif ve şüpheli seslendirmelerini üret', done: false, tool: 'ElevenLabs', priority: 'high' }
      ],
      generatedAt: '2026-05-30T00:30:00.000Z'
    }
  },

  // --- 1 INDONESIA PROJECT ---
  {
    id: 'indo-01',
    title: 'Endonezya tarihi kitabi',
    rawInput: 'Endonezce tarih kitabı çocuklar için. 1 sayfası görsel, yanındaki sayfada olayın özeti var.',
    domain: 'indonesia',
    status: 'inbox',
    priority: 'medium',
    tags: ['indonesia', 'endonezya tarihi kitabi', 'buku sejarah anak', 'shopee id', 'tokopedia'],
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-11-03T10:00:00.000Z',
    isFavorite: true,
    maturityScore: 20,
    actionPlan: {
      summary: 'Çocuklar için Bahasa Indonesia dilinde hazırlanan, sol sayfasında resim sağ sayfasında özet metin bulunan Endonezya tarihi kitabı.',
      tags: ['buku sejarah anak', 'sejarah indonesia', 'shopee indonesia'],
      domainSpecifics: {
        niche: 'Endonezya Eğitim & Çocuk Tarih Kitabı',
        productType: 'Amazon KDP & Shopee/Tokopedia PDF Dijital İndirme',
        targetAudience: 'Endonezyalı ebeveynler, ilkokul öğrencileri ve öğretmenler'
      },
      checklist: [
        { id: 'c29', text: 'Endonezya tarihi 20 kilit olayın resimlerini üret', done: false, tool: 'Midjourney', priority: 'high' },
        { id: 'c30', text: 'Bahasa Indonesia özet metinlerini tamamla', done: false, tool: 'Cursor', priority: 'high' }
      ],
      generatedAt: '2026-05-30T00:30:00.000Z'
    }
  }
];

// -------------------------------------------------------------
// LOCAL STORAGE CACHE HELPERS
// -------------------------------------------------------------
export const getStoredIdeas = (): IdeaItem[] => {
  try {
    localStorage.removeItem('omnifocus_ideas_v3');
    localStorage.removeItem('omnifocus_ideas_v2');
  } catch {}

  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 21 && parsed.some(i => i.title === 'Etsy Affirmation Poster-Calendar')) {
        return parsed;
      }
    } catch (e) {
      console.warn('LocalStorage parse warning:', e);
    }
  }

  // Force re-seed exact 21 user projects
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(REAL_USER_PROJECTS));
  } catch (e) {
    console.warn('LocalStorage initial seed warning:', e);
  }
  return REAL_USER_PROJECTS;
};

const saveLocalIdea = (idea: IdeaItem) => {
  try {
    const list = getStoredIdeas();
    const index = list.findIndex(i => i.id === idea.id);
    if (index >= 0) {
      list[index] = idea;
    } else {
      list.unshift(idea);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage save warning:', e);
  }
};

const deleteLocalIdea = (ideaId: string) => {
  try {
    const list = getStoredIdeas().filter(i => i.id !== ideaId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('LocalStorage delete warning:', e);
  }
};

export const clearLocalStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

export const resetToRealProjects = async (userId: string = 'omni_creator'): Promise<IdeaItem[]> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(REAL_USER_PROJECTS));
    for (const item of REAL_USER_PROJECTS) {
      saveIdeaToSupabase(userId, item).catch(() => {});
    }
  } catch (e) {
    console.warn('Reset to real projects notice:', e);
  }
  return REAL_USER_PROJECTS;
};

// -------------------------------------------------------------
// ROW CONVERTERS FOR SUPABASE (snake_case)
// -------------------------------------------------------------
export function ideaItemToRow(userId: string, idea: IdeaItem) {
  const actionPlanMerged = idea.actionPlan ? {
    ...idea.actionPlan,
    notes: idea.notes,
    reminders: idea.reminders,
    youtubeStudio: idea.youtubeStudio,
    aiAppStudio: idea.aiAppStudio,
    indonesiaStudio: idea.indonesiaStudio,
    dataComparison: idea.dataComparison,
  } : (idea.notes || idea.reminders || idea.youtubeStudio || idea.aiAppStudio ? {
    summary: '',
    tags: idea.tags || [],
    domainSpecifics: {},
    checklist: [],
    generatedAt: new Date().toISOString(),
    notes: idea.notes,
    reminders: idea.reminders,
    youtubeStudio: idea.youtubeStudio,
    aiAppStudio: idea.aiAppStudio,
    indonesiaStudio: idea.indonesiaStudio,
    dataComparison: idea.dataComparison,
  } : null);

  return {
    id: idea.id,
    user_id: userId,
    title: idea.title || '',
    raw_input: idea.rawInput || '',
    domain: idea.domain || 'etsy_pod',
    status: idea.status || 'inbox',
    priority: idea.priority || 'medium',
    tags: Array.isArray(idea.tags) ? idea.tags : [],
    action_plan: actionPlanMerged,
    grounded_research: idea.groundedResearch || null,
    sub_ideas: idea.subIdeas || null,
    etsy_listing: idea.etsyListing || null,
    visual_concepts: idea.visualConcepts || null,
    design_brief: idea.designBrief || null,
    maturity_score: typeof idea.maturityScore === 'number' ? idea.maturityScore : calculateMaturityScore(idea).score,
    is_favorite: !!idea.isFavorite,
    parent_id: idea.parentId || null,
    created_at: idea.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function rowToIdeaItem(row: any): IdeaItem {
  const actionPlan = row.action_plan || undefined;
  return {
    id: row.id,
    title: row.title || '',
    rawInput: row.raw_input || '',
    domain: row.domain || 'etsy_pod',
    status: row.status || 'inbox',
    priority: row.priority || 'medium',
    tags: Array.isArray(row.tags) ? row.tags : [],
    actionPlan: actionPlan ? {
      summary: actionPlan.summary || '',
      tags: actionPlan.tags || [],
      domainSpecifics: actionPlan.domainSpecifics || {},
      checklist: actionPlan.checklist || [],
      strategicNotes: actionPlan.strategicNotes,
      generatedAt: actionPlan.generatedAt || row.updated_at || '',
    } : undefined,
    notes: actionPlan?.notes || row.notes || undefined,
    reminders: actionPlan?.reminders || undefined,
    youtubeStudio: actionPlan?.youtubeStudio || undefined,
    aiAppStudio: actionPlan?.aiAppStudio || undefined,
    indonesiaStudio: actionPlan?.indonesiaStudio || undefined,
    dataComparison: actionPlan?.dataComparison || undefined,
    groundedResearch: row.grounded_research || undefined,
    subIdeas: row.sub_ideas || undefined,
    etsyListing: row.etsy_listing || undefined,
    visualConcepts: row.visual_concepts || undefined,
    designBrief: row.design_brief || undefined,
    maturityScore: typeof row.maturity_score === 'number' ? row.maturity_score : undefined,
    isFavorite: !!row.is_favorite,
    parentId: row.parent_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// SUPABASE CRUD OPERATIONS WITH LOCAL FALLBACK
// -------------------------------------------------------------
export const subscribeToIdeas = (userId: string, callback: (ideas: IdeaItem[]) => void) => {
  const cached = getStoredIdeas();
  if (cached.length > 0) {
    callback(cached);
  }

  const fetchIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch ideas info:', error.message);
        callback(getStoredIdeas());
        return;
      }
      if (data && data.length > 0 && data.some((r: any) => r.title === 'Etsy Affirmation Poster-Calendar')) {
        const ideas = data.map(rowToIdeaItem);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
        callback(ideas);
      } else {
        // Sync exact 21 user projects to Supabase if database is empty or has old filler schema
        for (const item of REAL_USER_PROJECTS) {
          supabase.from('ideas').upsert(ideaItemToRow(userId, item)).then();
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(REAL_USER_PROJECTS));
        callback(REAL_USER_PROJECTS);
      }
    } catch (err) {
      console.warn('Querying ideas fallback to local storage:', err);
      callback(getStoredIdeas());
    }
  };

  fetchIdeas();

  try {
    const channel = supabase
      .channel(`ideas_realtime_${userId}_${Math.random().toString(36).substring(2, 9)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchIdeas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
};

export const saveIdeaToSupabase = async (userId: string, idea: IdeaItem) => {
  saveLocalIdea(idea);

  try {
    const row = ideaItemToRow(userId, idea);
    const { data, error } = await supabase
      .from('ideas')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase save note (saved to local cache):', error.message);
    }
    return data;
  } catch (err) {
    console.warn('Supabase save exception (persisted locally):', err);
  }
};

export const deleteIdeaFromSupabase = async (userId: string, ideaId: string) => {
  deleteLocalIdea(ideaId);

  try {
    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', ideaId)
      .eq('user_id', userId);

    if (error) {
      console.warn('Supabase delete notice:', error.message);
    }
  } catch (err) {
    console.warn('Supabase delete exception:', err);
  }
};

export const saveIdeaToFirebase = saveIdeaToSupabase;
export const deleteIdeaFromFirebase = deleteIdeaFromSupabase;

export const exportIdeasToMarkdown = (ideas: IdeaItem[], domainFilter: DomainType | 'all' = 'all') => {
  const filtered = domainFilter === 'all' ? ideas : ideas.filter(i => i.domain === domainFilter);
  let md = `# OmniFocus Projeleri - ${new Date().toLocaleDateString('tr-TR')}\n\n`;
  
  filtered.forEach(i => {
    md += `## ${i.title}\n`;
    md += `- **Durum:** ${i.status}\n`;
    md += `- **Domain:** ${i.domain}\n`;
    md += `- **Ham Not:** ${i.rawInput}\n\n`;
    if (i.actionPlan) {
      md += `### Aksiyon Planı\n${i.actionPlan.summary}\n\n`;
      md += `#### Görevler\n`;
      i.actionPlan.checklist.forEach(c => {
        md += `- [${c.done ? 'x' : ' '}] ${c.text}${c.tool ? ` (@${c.tool})` : ''}\n`;
      });
      md += `\n`;
    }
    if (i.etsyListing) {
      md += `### Etsy Listing\n`;
      md += `**Title:** ${i.etsyListing.title}\n\n`;
      md += `**Tags:** ${i.etsyListing.tags.join(', ')}\n\n`;
    }
    md += `---\n\n`;
  });
  return md;
};

export const exportIdeasToCsv = (ideas: IdeaItem[], domainFilter: DomainType | 'all' = 'all') => {
  const filtered = domainFilter === 'all' ? ideas : ideas.filter(i => i.domain === domainFilter);
  const headers = ['ID', 'Title', 'Domain', 'Status', 'CreatedAt', 'RawInput', 'Maturity'];
  const rows = filtered.map(i => [
    i.id,
    `"${(i.title || '').replace(/"/g, '""')}"`,
    i.domain,
    i.status,
    i.createdAt,
    `"${(i.rawInput || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    calculateMaturityScore(i).score
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};
