import { IdeaItem, PipelineStepName, PipelineStepStatus, IdeaCombinationSuggestion, UserKeywordMetric } from '../types';
import { saveIdeaToFirebase, calculateMaturityScore } from './storage';
import { 
  requestAiActionPlan, 
  requestGroundedResearch, 
  requestSubIdeas, 
  requestEtsyListing, 
  requestVisualConcepts, 
  requestDesignBrief, 
  requestYouTubeStudio 
} from './aiService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Helper to fetch matching keywords from Keyword Repository
export const fetchRelevantKeywordsForIdea = async (userId: string, idea: IdeaItem): Promise<UserKeywordMetric[]> => {
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'keywords'));
    if (snap.empty) return [];

    const allKw = snap.docs.map(d => d.data());
    const textToMatch = `${idea.title} ${idea.rawInput} ${idea.tags.join(' ')}`.toLowerCase();

    const matches = allKw.filter(kw => {
      const k = (kw.keyword || '').toLowerCase();
      const tagsMatch = (kw.nicheTags || []).some((t: string) => textToMatch.includes(t.toLowerCase()));
      return textToMatch.includes(k) || k.split(' ').some((w: string) => w.length > 3 && textToMatch.includes(w)) || tagsMatch;
    });

    return matches.slice(0, 10).map(m => ({
      keyword: m.keyword,
      searchVolume: Number(m.searchVolume) || 0,
      competitionResults: Number(m.competitionResults) || 0,
      conversionRate: Number(m.conversionRate) || 0,
      source: 'user_keyword_data',
      notes: `Merkezi Keyword Deposundan çekildi (${m.uploadedAt?.slice(0, 10) || ''})`
    }));
  } catch (err) {
    console.warn('Could not query keyword repository:', err);
    return [];
  }
};

// Helper to calculate combination suggestions between new idea and existing pool
export const calculateCombinationSuggestions = (idea: IdeaItem, allIdeas: IdeaItem[]): IdeaCombinationSuggestion[] => {
  const suggestions: IdeaCombinationSuggestion[] = [];
  const otherIdeas = allIdeas.filter(i => i.id !== idea.id);

  for (const other of otherIdeas) {
    // Check tag or domain overlap
    const sharedTags = idea.tags.filter(t => other.tags.includes(t));
    const titleWords1 = idea.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const titleWords2 = other.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    const sharedWords = titleWords1.filter((w: string) => titleWords2.includes(w));

    if (sharedTags.length >= 2 || sharedWords.length >= 1 || (idea.domain === other.domain && sharedTags.length >= 1)) {
      suggestions.push({
        ideaId: other.id,
        title: other.title,
        domain: other.domain,
        rationale: `Bu 2 fikir ortak niş etiketlerini (${sharedTags.join(', ') || sharedWords.join(', ')}) paylaşıyor. Tek bir hibrit ürün veya içerik serisinde birleştirilebilir.`,
        suggestedCombinedTitle: `${idea.title} x ${other.title} Koleksiyonu`
      });
    }
  }

  return suggestions.slice(0, 3);
};

export interface RunPipelineOptions {
  userId: string;
  idea: IdeaItem;
  allIdeasPool?: IdeaItem[];
  singleStepOnly?: PipelineStepName;
  onProgress?: (updatedIdea: IdeaItem) => void;
  onToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const runAutomatedPipeline = async ({
  userId,
  idea,
  allIdeasPool = [],
  singleStepOnly,
  onProgress,
  onToast
}: RunPipelineOptions): Promise<IdeaItem> => {
  let currentIdea: IdeaItem = { ...idea };
  
  // Initialize step statuses if missing
  const stepList: { key: PipelineStepName; label: string }[] = idea.domain === 'youtube_automation'
    ? [
        { key: 'transform', label: '1. Fikir Dönüştürme & Plan' },
        { key: 'grounded-research', label: '2. Google Canlı Pazar Araştırması' },
        { key: 'sub-ideas', label: '3. Niş Kombinasyonları' },
        { key: 'youtube-studio', label: '4. YouTube Studio Paketi' },
        { key: 'visual-concepts', label: '5. 20 Thumbnail Promptu' },
        { key: 'design-brief', label: '6. Görsel Prodüksiyon Briefi' }
      ]
    : [
        { key: 'transform', label: '1. Fikir Dönüştürme & Plan' },
        { key: 'grounded-research', label: '2. Google Canlı Pazar Araştırması' },
        { key: 'sub-ideas', label: '3. Niş Kombinasyonları' },
        { key: 'etsy-listing', label: '4. Etsy SEO & Listing Taslağı' },
        { key: 'visual-concepts', label: '5. 20 AI Görsel Promptu' },
        { key: 'design-brief', label: '6. Tasarım Briefi' }
      ];

  const initialPipelineStatus: Record<string, PipelineStepStatus> = { ...(currentIdea.pipelineStatus || {}) };
  stepList.forEach(s => {
    if (!initialPipelineStatus[s.key]) {
      initialPipelineStatus[s.key] = { step: s.key, label: s.label, status: 'idle' };
    }
  });

  currentIdea.pipelineStatus = initialPipelineStatus;
  currentIdea.pipelineRunning = true;

  // Auto Status Transition #1: Shift inbox -> research on pipeline start
  if (currentIdea.status === 'inbox') {
    currentIdea.status = 'research';
  }

  // Fetch central keywords
  const repoKeywords = await fetchRelevantKeywordsForIdea(userId, currentIdea);
  if (repoKeywords.length > 0) {
    currentIdea.userKeywords = repoKeywords;
  }

  // Compute combinations
  if (allIdeasPool.length > 0) {
    currentIdea.combinationSuggestions = calculateCombinationSuggestions(currentIdea, allIdeasPool);
  }

  const stepsToExecute = singleStepOnly 
    ? stepList.filter(s => s.key === singleStepOnly)
    : stepList;

  onToast?.(`🚀 ${currentIdea.title} için Otomatik Pipeline Başlatıldı`, 'info');

  for (const stepObj of stepsToExecute) {
    const key = stepObj.key;
    
    // Set step status to running
    currentIdea.pipelineStatus = {
      ...currentIdea.pipelineStatus,
      [key]: { step: key, label: stepObj.label, status: 'running' }
    };
    
    // Save state & trigger UI callback
    await saveIdeaToFirebase(userId, currentIdea);
    onProgress?.(currentIdea);

    try {
      if (key === 'transform') {
        const plan = await requestAiActionPlan(currentIdea.rawInput, currentIdea.domain, currentIdea.title);
        currentIdea.actionPlan = plan;
        if (plan.tags) currentIdea.tags = Array.from(new Set([...currentIdea.tags, ...plan.tags]));
      } 
      else if (key === 'grounded-research') {
        const research = await requestGroundedResearch(currentIdea.title, currentIdea.rawInput, currentIdea.domain, currentIdea.userKeywords);
        currentIdea.groundedResearch = research;
      }
      else if (key === 'sub-ideas') {
        const subs = await requestSubIdeas(currentIdea.title, currentIdea.rawInput, currentIdea.userKeywords, [], currentIdea.domain);
        currentIdea.subIdeas = subs;
      }
      else if (key === 'etsy-listing') {
        const listing = await requestEtsyListing(
          currentIdea.title,
          currentIdea.rawInput,
          currentIdea.userKeywords,
          currentIdea.actionPlan?.domainSpecifics?.designConcept,
          currentIdea.actionPlan?.domainSpecifics?.productType
        );
        currentIdea.etsyListing = listing;
      }
      else if (key === 'youtube-studio') {
        const yt = await requestYouTubeStudio(currentIdea.title, currentIdea.rawInput);
        currentIdea.youtubeStudio = yt;
      }
      else if (key === 'visual-concepts') {
        const visuals = await requestVisualConcepts(
          currentIdea.title,
          currentIdea.rawInput,
          currentIdea.actionPlan?.domainSpecifics?.designConcept,
          currentIdea.actionPlan?.domainSpecifics?.productType,
          currentIdea.domain
        );
        currentIdea.visualConcepts = Array.isArray(visuals) ? visuals : (visuals.visualConcepts || []);
      }
      else if (key === 'design-brief') {
        const brief = await requestDesignBrief(
          currentIdea.title,
          currentIdea.rawInput,
          currentIdea.actionPlan?.domainSpecifics?.productType,
          currentIdea.domain
        );
        currentIdea.designBrief = brief;
      }

      // Mark step completed
      currentIdea.pipelineStatus = {
        ...currentIdea.pipelineStatus,
        [key]: { step: key, label: stepObj.label, status: 'completed', completedAt: new Date().toISOString() }
      };

    } catch (err: any) {
      console.error(`Pipeline step ${key} failed:`, err);
      // Step failed, but do NOT stop pipeline
      currentIdea.pipelineStatus = {
        ...currentIdea.pipelineStatus,
        [key]: { step: key, label: stepObj.label, status: 'failed', error: err.message || 'Adım yürütülürken hata oluştu.' }
      };
    }

    // Live Maturity Score recalculation
    const scoreBreakdown = calculateMaturityScore(currentIdea);
    currentIdea.maturityScore = scoreBreakdown.score;

    // Auto Status Transition #2: If listing/studio + visual concepts done -> shift status to 'in_progress'
    const hasListingOrStudio = !!(currentIdea.etsyListing || currentIdea.youtubeStudio);
    const hasVisuals = !!(currentIdea.visualConcepts && currentIdea.visualConcepts.length >= 10);
    if (hasListingOrStudio && hasVisuals && currentIdea.status !== 'completed') {
      currentIdea.status = 'in_progress';
    }

    // Auto Status Transition #3: If score === 100 -> mark completed / publish ready
    if (scoreBreakdown.score === 100) {
      if (currentIdea.status !== 'completed') {
        currentIdea.status = 'completed';
        onToast?.(`🎉 YAYINA HAZIR! "${currentIdea.title}" %100 olgunluğa ulaştı!`, 'success');
      }
    }

    currentIdea.updatedAt = new Date().toISOString();
    await saveIdeaToFirebase(userId, currentIdea);
    onProgress?.(currentIdea);
  }

  currentIdea.pipelineRunning = false;
  await saveIdeaToFirebase(userId, currentIdea);
  onProgress?.(currentIdea);

  return currentIdea;
};
