import { IdeaItem, DomainType, StatusType, MaturityScoreBreakdown } from '../types';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';

const STORAGE_KEY = 'omnifocus_ideas_v3';

// Helper to handle Firestore errors as requested by system skills
function handleFirestoreError(error: any, operation: string, path: string | null = null) {
  const errInfo = {
    error: error.message || String(error),
    operationType: operation,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    }
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

// FIREBASE CRUD
export const subscribeToIdeas = (userId: string, callback: (ideas: IdeaItem[]) => void) => {
  const q = query(
    collection(db, 'users', userId, 'ideas'),
    orderBy('updatedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const ideas = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
    } as IdeaItem));
    callback(ideas);
  }, (error) => {
    handleFirestoreError(error, 'LIST', `users/${userId}/ideas`);
  });
};

export const saveIdeaToFirebase = async (userId: string, idea: IdeaItem) => {
  const path = `users/${userId}/ideas/${idea.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'ideas', idea.id), {
      ...idea,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, 'WRITE', path);
  }
};

export const seedRealProjectsToFirebase = async (userId: string) => {
  const path = `users/${userId}/ideas`;
  try {
    const batch = writeBatch(db);
    for (const idea of REAL_USER_PROJECTS) {
      const ref = doc(db, 'users', userId, 'ideas', idea.id);
      batch.set(ref, {
        ...idea,
        updatedAt: idea.updatedAt || new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, 'BATCH_WRITE', path);
  }
};

export const deleteIdeaFromFirebase = async (userId: string, ideaId: string) => {
  const path = `users/${userId}/ideas/${ideaId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'ideas', ideaId));
  } catch (error) {
    handleFirestoreError(error, 'DELETE', path);
  }
};

// LOCAL STORAGE FALLBACKS (Migration support)
export const getStoredIdeas = (): IdeaItem[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return REAL_USER_PROJECTS;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const clearLocalStorage = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// THE EXACT 21 USER PROJECTS (Restored)
export const REAL_USER_PROJECTS: IdeaItem[] = [
  {
    id: 'idea-1',
    title: 'Etsy Affirmation Poster-Calendar',
    rawInput: 'Affirmation, motivational, inspirational posterler tasarlanır. Örnek fikir olarak geçmiş yıla ait 12 adet başarı-mutluluk anlarının fotoğrafları ile takvim yapılır. Ya da her ay için bir görselle takvim yapılır. Bunun gibi fikirler için yapay zekadan destek alınır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['affirmation', 'calendar', 'motivation'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-2',
    title: 'Kisisellestirilmis poster',
    rawInput: 'Kişilerin kendi vereceği sözler veya fotoğraflardan bir poster tasarımı. Custom Poster başlığıyla satılır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['custom', 'personalized', 'gift'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-3',
    title: 'World Cup 2026',
    rawInput: 'World Cup 2026 temalı ürünler: 1- Oyuncu kartları, 2- Takım posterleri, 3- Fixture, 4- İkonik gol sevinçleri, 5- vs...',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['worldcup', 'sports', 'football'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-4',
    title: 'Spotify poster',
    rawInput: 'Spotify temalı song poster. Custom Songs Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı şarkısını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['spotify', 'music', 'personalized'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-5',
    title: 'Album Cover Poster',
    rawInput: 'Custom Album Cover Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı albümünü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['album', 'music', 'decor'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-6',
    title: 'Movie Poster',
    rawInput: 'Custom Movie-Series Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı filmini veya dizisini aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['movie', 'cinema', 'personalized'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-7',
    title: 'Space Theme Poster',
    rawInput: 'Custom Space Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı yıldızını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['space', 'astronomy', 'stars'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-8',
    title: 'Mystical Poster',
    rawInput: 'Custom Mystic Poster olarak tanımlanır. Mystic temalı onlarca poster üretecek bir uygulama yapılır, bu sayede binlerce otomatik ürün yaratılır.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['mystic', 'automation', 'art'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-9',
    title: 'Stoaic Poster',
    rawInput: 'Custom Stoaic Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı filozofu ve sözünü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['stoic', 'philosophy', 'quotes'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-10',
    title: 'Custom Car Poster',
    rawInput: 'Custom Car Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı arabasını aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['car', 'automotive', 'personalized'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-11',
    title: 'Patent poster',
    rawInput: 'Custom Patent Poster olarak tanımlanır. Gelen sipariş mailinden kullanıcının maili alınır, o maile kişiye özel bir link gönderilir ve kullanıcı ürününü aratıp bularak kendi kişiselleştirilmiş posterini oluşturur.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'medium',
    tags: ['patent', 'vintage', 'technical'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-12',
    title: 'Ressam Collection',
    rawInput: 'Ünlü ressamların tüm resimlerinin dijital versiyonlarının koleksiyonu.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['painter', 'collection', 'digital'],
    createdAt: '2026-05-04T00:00:00Z',
    updatedAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'idea-13',
    title: 'YouTube Play Button',
    rawInput: 'YouTube playbutton posteri için html, foamboard play button, foamboard play button ledli, alüminyum yekpare.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['youtube', 'playbutton', 'creator'],
    createdAt: '2026-05-05T00:00:00Z',
    updatedAt: '2026-05-05T00:00:00Z'
  },
  {
    id: 'idea-14',
    title: 'Sehir Posterleri',
    rawInput: 'Sehir Posterleri. (Etiket: CITYPOSTER)',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['city', 'poster', 'CITYPOSTER'],
    createdAt: '2026-06-24T00:00:00Z',
    updatedAt: '2026-06-24T00:00:00Z'
  },
  {
    id: 'idea-15',
    title: 'Dini Poster',
    rawInput: 'Dini Poster, niche olarak hac şeklinde yazılmış dini sözler, ilahiler.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['religion', 'sacred', 'typography'],
    createdAt: '2026-06-24T00:00:00Z',
    updatedAt: '2026-06-24T00:00:00Z'
  },
  {
    id: 'idea-16',
    title: 'Botanical Wallpaper',
    rawInput: 'Botanical Wallpaper.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['botanical', 'wallpaper', 'home'],
    createdAt: '2026-06-24T00:00:00Z',
    updatedAt: '2026-06-24T00:00:00Z'
  },
  {
    id: 'idea-17',
    title: 'movie ticket poser',
    rawInput: 'Movie ticket style customized poster designs.',
    domain: 'etsy_pod',
    status: 'inbox',
    priority: 'high',
    tags: ['movie', 'ticket', 'retro'],
    createdAt: '2026-11-02T00:00:00Z',
    updatedAt: '2026-11-02T00:00:00Z'
  },
  {
    id: 'idea-18',
    title: 'Utanc Hikayeleri',
    rawInput: 'İnsanların utandığı hikayeleri anlatacak. “Su zaman şunu yapmıştım bu zaman bunu yapmıştım” gibi. Biraz Esra Erol tarzı şok edici şeyler olmalı. Tvlerde çıkan yüzü gösterilmeyen kompozisyonunda olacak.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['stories', 'social', 'faceless'],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z'
  },
  {
    id: 'idea-19',
    title: 'Itiraf ediyorum',
    rawInput: 'Çarpıcı itirafların yayınlandığı bir YouTube kanalı.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['confessions', 'viral', 'faceless'],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z'
  },
  {
    id: 'idea-20',
    title: 'Sorgu odasi',
    rawInput: 'Bir karakolun sorgu odası konseptinde kurgusal cinayetler ve onları çözen dedektifler olacak. Birkaç farklı şüpheliyi sorguladıktan sonra çözecekler. Hatta çözmeyip izleyiciye soracaklar ve bir sonraki bölümde çözecekler.',
    domain: 'youtube_automation',
    status: 'inbox',
    priority: 'medium',
    tags: ['mystery', 'detective', 'interactive'],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z'
  },
  {
    id: 'idea-21',
    title: 'Endonezya tarihi kitabi',
    rawInput: 'Endonezce tarih kitabı çocuklar için. 1 sayfası görsel, yanındaki sayfada olayın özeti var.',
    domain: 'indonesia',
    status: 'inbox',
    priority: 'medium',
    tags: ['indonesia', 'history', 'book', 'children'],
    createdAt: '2026-05-30T00:00:00Z',
    updatedAt: '2026-05-30T00:00:00Z'
  }
];

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
    `"${i.title.replace(/"/g, '""')}"`,
    i.domain,
    i.status,
    i.createdAt,
    `"${i.rawInput.replace(/"/g, '""').replace(/\n/g, ' ')}"`,
    calculateMaturityScore(i).score
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};
