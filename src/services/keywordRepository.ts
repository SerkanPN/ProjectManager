import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { KeywordRepositoryItem, UserKeywordMetric } from '../types';

export const calculateKeywordWeight = (item: { searchVolume: number; conversionRate: number; uploadedAt: string }): number => {
  const uploadDate = new Date(item.uploadedAt || new Date()).getTime();
  const now = Date.now();
  const diffDays = Math.max(0.1, (now - uploadDate) / (1000 * 60 * 60 * 24));
  
  // Recency factor: newer uploads get a higher multiplier (1.0 -> 0.5 over 60 days)
  const recencyFactor = 1 / (1 + diffDays / 60);
  
  // Volume log scale (0-10)
  const volumeScore = Math.min(10, Math.log10((item.searchVolume || 0) + 1) * 2);
  
  // Conversion rate (0-10)
  const conversionScore = Math.min(10, item.conversionRate || 0);
  
  // Weighted score (0-100)
  const total = (conversionScore * 5 + volumeScore * 3.5) * (0.6 + 0.4 * recencyFactor);
  return Math.min(100, Math.round(total * 10) / 10);
};

export const INITIAL_KEYWORD_METRICS: Omit<KeywordRepositoryItem, 'id'>[] = [
  { keyword: 'affirmation poster calendar 2026', searchVolume: 18500, competitionResults: 420, conversionRate: 5.8, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['affirmation', 'calendar', 'poster'] },
  { keyword: 'personalized spotify song poster', searchVolume: 42000, competitionResults: 1850, conversionRate: 6.2, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['spotify', 'music', 'poster'] },
  { keyword: 'custom album cover print', searchVolume: 31000, competitionResults: 1200, conversionRate: 5.4, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['album', 'music', 'custom'] },
  { keyword: 'custom movie ticket poster', searchVolume: 15400, competitionResults: 380, conversionRate: 7.1, uploadedAt: '2026-11-02T00:00:00Z', nicheTags: ['movie', 'ticket', 'poster'] },
  { keyword: 'custom star map night sky', searchVolume: 28900, competitionResults: 1400, conversionRate: 5.9, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['space', 'stars', 'custom'] },
  { keyword: 'world cup 2026 fixture poster', searchVolume: 39000, competitionResults: 620, conversionRate: 6.8, uploadedAt: '2026-11-02T00:00:00Z', nicheTags: ['worldcup', 'sports', 'football'] },
  { keyword: 'stoic philosophy marcus aurelius quote', searchVolume: 14200, competitionResults: 290, conversionRate: 6.5, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['stoic', 'philosophy', 'quotes'] },
  { keyword: 'custom car blueprint patent art', searchVolume: 22100, competitionResults: 510, conversionRate: 5.7, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['car', 'patent', 'custom'] },
  { keyword: 'botanical vintage wallpaper print', searchVolume: 19800, competitionResults: 940, conversionRate: 4.9, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['botanical', 'wallpaper'] },
  { keyword: 'religious typography cross art', searchVolume: 11200, competitionResults: 310, conversionRate: 6.0, uploadedAt: '2026-11-01T00:00:00Z', nicheTags: ['religion', 'sacred'] }
];

export const subscribeToKeywords = (userId: string, callback: (keywords: KeywordRepositoryItem[]) => void) => {
  const q = query(
    collection(db, 'users', userId, 'keywords'),
    orderBy('searchVolume', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => {
      const data = doc.data() as KeywordRepositoryItem;
      const weightScore = calculateKeywordWeight(data);
      return {
        ...data,
        id: doc.id,
        weightScore
      };
    });
    
    // Sort by weightScore desc
    list.sort((a, b) => (b.weightScore || 0) - (a.weightScore || 0));
    callback(list);
  }, (err) => {
    console.error('Error fetching keyword repo:', err);
  });
};

export const seedKeywordsToRepository = async (userId: string) => {
  try {
    const batch = writeBatch(db);
    for (const kw of INITIAL_KEYWORD_METRICS) {
      const id = kw.keyword.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const ref = doc(db, 'users', userId, 'keywords', id);
      batch.set(ref, {
        id,
        ...kw,
        uploadedAt: kw.uploadedAt || new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
  } catch (error) {
    console.error('Failed to seed keyword repository:', error);
  }
};

export const saveKeywordToRepository = async (
  userId: string, 
  item: { keyword: string; searchVolume: number; competitionResults: number; conversionRate: number; nicheTags?: string[]; notes?: string }
) => {
  const id = item.keyword.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
  const ref = doc(db, 'users', userId, 'keywords', id);
  const now = new Date().toISOString();
  
  await setDoc(ref, {
    id,
    keyword: item.keyword.trim(),
    searchVolume: Number(item.searchVolume) || 0,
    competitionResults: Number(item.competitionResults) || 0,
    conversionRate: Number(item.conversionRate) || 0,
    uploadedAt: now,
    nicheTags: item.nicheTags || [],
    notes: item.notes || ''
  }, { merge: true });
};

export const deleteKeywordFromRepository = async (userId: string, keywordId: string) => {
  await deleteDoc(doc(db, 'users', userId, 'keywords', keywordId));
};

export const parseCsvKeywords = (csvText: string): { keyword: string; searchVolume: number; competitionResults: number; conversionRate: number }[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length <= 1) return [];

  const results: { keyword: string; searchVolume: number; competitionResults: number; conversionRate: number }[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^"/, '').replace(/"$/, ''));
    if (parts.length >= 2 && parts[0]) {
      const keyword = parts[0];
      const searchVolume = parseInt(parts[1], 10) || 0;
      const competitionResults = parseInt(parts[2], 10) || 0;
      const conversionRate = parseFloat(parts[3]) || 0;
      
      results.push({
        keyword,
        searchVolume,
        competitionResults,
        conversionRate
      });
    }
  }

  return results;
};
