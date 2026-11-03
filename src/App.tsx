/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { DomainType, StatusType, IdeaItem, ViewMode, PriorityType } from './types';
import { 
  subscribeToIdeas, 
  saveIdeaToFirebase, 
  seedRealProjectsToFirebase,
  deleteIdeaFromFirebase, 
  getStoredIdeas, 
  clearLocalStorage,
  REAL_USER_PROJECTS 
} from './services/storage';
import { subscribeToKeywords } from './services/keywordRepository';
import { runAutomatedPipeline } from './services/pipelineEngine';
import { checkAndRunSeasonalAutomation } from './services/seasonalAutomation';
import { KeywordRepositoryItem } from './types';
import { auth, signInWithGoogle } from './services/firebase';
import { requestAiActionPlan } from './services/aiService';
import { createLocalBackupSnapshot, getSettings, saveSettings } from './services/backupService';
import { uploadBackupToDrive } from './services/driveService';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { ListView } from './components/ListView';
import { QuickCaptureModal } from './components/QuickCaptureModal';
import { IdeaDetailModal } from './components/IdeaDetailModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { KeywordRepositoryModal } from './components/KeywordRepositoryModal';
import { InsightsPanel } from './components/InsightsPanel';
import { TimelineView } from './components/TimelineView';
import { ReminderBanner } from './components/ReminderBanner';
import { LogIn, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [keywords, setKeywords] = useState<KeywordRepositoryItem[]>([]);
  
  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };
  
  // Persisted view states
  const [activeDomain, setActiveDomain] = useState<DomainType | 'all'>(
    (localStorage.getItem('activeDomain') as any) || 'all'
  );
  const [activeStatusFilter, setActiveStatusFilter] = useState<StatusType | 'all'>(
    (localStorage.getItem('activeStatusFilter') as any) || 'all'
  );
  const [viewMode, setViewMode] = useState<ViewMode>(
    (localStorage.getItem('viewMode') as any) || 'kanban'
  );
  
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<IdeaItem | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeywordsOpen, setIsKeywordsOpen] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Sync state to localStorage for persistence across reloads
  useEffect(() => {
    localStorage.setItem('activeDomain', activeDomain);
    localStorage.setItem('activeStatusFilter', activeStatusFilter);
    localStorage.setItem('viewMode', viewMode);
  }, [activeDomain, activeStatusFilter, viewMode]);

  // Auth & Subscriptions
  useEffect(() => {
    let hasSeeded = false;
    let unsubKw: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      
      if (u) {
        // 1. Subscribe to Ideas
        const unsubIdeas = subscribeToIdeas(u.uid, (newIdeas) => {
          if (newIdeas.length === 0 && !hasSeeded) {
            hasSeeded = true;
            setIdeas(REAL_USER_PROJECTS);
            seedRealProjectsToFirebase(u.uid);
          } else if (newIdeas.length === 0) {
            setIdeas(REAL_USER_PROJECTS);
          } else {
            setIdeas(newIdeas);
          }
        });

        // 2. Subscribe to Keyword Repository
        unsubKw = subscribeToKeywords(u.uid, (kws) => {
          setKeywords(kws);
        });

        return () => {
          unsubIdeas();
          if (unsubKw) unsubKw();
        };
      } else {
        setIdeas([]);
        setKeywords([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Background Seasonal Automation Check (Runs once per session)
  useEffect(() => {
    if (user && ideas.length > 0) {
      checkAndRunSeasonalAutomation(user.uid, ideas, showToast);
    }
  }, [user?.uid, ideas.length]);

  // Periodic Drive Backup Logic
  useEffect(() => {
    if (!user || !accessToken) return;
    
    const settings = getSettings();
    if (!settings.isDriveBackupEnabled) return;

    const lastBackup = settings.lastDriveBackupTimestamp;
    const now = new Date();
    
    // Simple check: backup once per session/day
    if (!lastBackup || (now.getTime() - new Date(lastBackup).getTime() > 24 * 60 * 60 * 1000)) {
      const filename = `omnifocus_backup_${now.toISOString().slice(0, 10)}.json`;
      uploadBackupToDrive(accessToken, filename, JSON.stringify(ideas))
        .then(() => {
          saveSettings({ ...settings, lastDriveBackupTimestamp: now.toISOString() });
        })
        .catch(err => console.error('Drive Auto Backup failed:', err));
    }
  }, [user, accessToken, ideas]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deep Search Filter
  const filteredIdeas = useMemo(() => {
    return ideas.filter((item) => {
      if (activeDomain !== 'all' && item.domain !== activeDomain) return false;
      if (activeStatusFilter !== 'all' && item.status !== activeStatusFilter) return false;
      if (showFavoritesOnly && !item.isFavorite) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();

        // 1. Basic fields
        const matchesTitle = item.title?.toLowerCase().includes(query);
        const matchesRaw = item.rawInput?.toLowerCase().includes(query);
        const matchesSummary = item.actionPlan?.summary?.toLowerCase().includes(query);
        const matchesNotes = item.notes?.toLowerCase().includes(query);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(query));

        // 2. Listing fields
        const matchesListingTitle = item.etsyListing?.title?.toLowerCase().includes(query);
        const matchesListingDesc = item.etsyListing?.description?.toLowerCase().includes(query);
        const matchesListingTags = item.etsyListing?.tags?.some((t) => t.toLowerCase().includes(query));

        // 3. Sub-ideas & Strategic notes
        const matchesSubIdeas = item.subIdeas?.some(
          (s) =>
            s.angle?.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query) ||
            s.rationale?.toLowerCase().includes(query)
        );
        const matchesStratNotes = item.actionPlan?.strategicNotes?.toLowerCase().includes(query);

        // 4. Checklist text & notes & tools
        const matchesChecklist = item.actionPlan?.checklist?.some(
          (c) =>
            c.text?.toLowerCase().includes(query) ||
            c.notes?.toLowerCase().includes(query) ||
            c.tool?.toLowerCase().includes(query)
        );

        // 5. Research report & Domain specifics
        const matchesGrounded = item.groundedResearch?.report?.toLowerCase().includes(query);
        const domainStr = JSON.stringify(item.actionPlan?.domainSpecifics || {}).toLowerCase();
        const matchesDomainSpecifics = domainStr.includes(query);

        if (
          !matchesTitle && !matchesRaw && !matchesSummary && !matchesNotes && !matchesTags &&
          !matchesListingTitle && !matchesListingDesc && !matchesListingTags &&
          !matchesSubIdeas && !matchesStratNotes && !matchesChecklist &&
          !matchesGrounded && !matchesDomainSpecifics
        ) {
          return false;
        }
      }
      return true;
    });
  }, [ideas, activeDomain, activeStatusFilter, showFavoritesOnly, searchQuery]);

  // Counts for sidebar badges
  const counts = useMemo(() => {
    return {
      all: ideas.length,
      etsy_pod: ideas.filter((i) => i.domain === 'etsy_pod').length,
      youtube_automation: ideas.filter((i) => i.domain === 'youtube_automation').length,
      ai_apps: ideas.filter((i) => i.domain === 'ai_apps').length,
      indonesia: ideas.filter((i) => i.domain === 'indonesia').length,
      inbox: ideas.filter((i) => i.status === 'inbox').length,
      research: ideas.filter((i) => i.status === 'research').length,
      in_progress: ideas.filter((i) => i.status === 'in_progress').length,
      completed: ideas.filter((i) => i.status === 'completed').length,
      favorites: ideas.filter((i) => i.isFavorite).length,
    };
  }, [ideas]);

  const pendingRemindersCount = useMemo(() => {
    return ideas.filter((i) => (i.reminder && !i.reminder.isCompleted) || (i.reminders && i.reminders.some((r) => !r.isCompleted))).length;
  }, [ideas]);

  const handleLogin = async () => {
    try {
      const res = await signInWithGoogle();
      if (res.accessToken) setAccessToken(res.accessToken);
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const handleSaveNewIdea = async (data: {
    title: string;
    rawInput: string;
    domain: DomainType;
    priority?: PriorityType;
    generateActionPlanImmediately?: boolean;
    parentId?: string;
  }) => {
    if (!user) return;
    const newId = `idea-${Date.now()}`;
    const newIdea: IdeaItem = {
      id: newId,
      title: data.title,
      rawInput: data.rawInput,
      domain: data.domain,
      status: 'inbox',
      priority: data.priority || 'medium',
      tags: [data.domain.replace('_', ' ')],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      parentId: data.parentId
    };

    // Save initial record to Firestore
    await saveIdeaToFirebase(user.uid, newIdea);

    // Auto-trigger full automated pipeline (transform -> grounded-research -> sub-ideas -> etsy-listing/youtube-studio -> visual-concepts -> design-brief)
    runAutomatedPipeline({
      userId: user.uid,
      idea: newIdea,
      allIdeasPool: ideas,
      onToast: showToast
    });
  };

  const handleRunPipelineForIdea = async (targetIdea: IdeaItem) => {
    if (!user) return;
    runAutomatedPipeline({
      userId: user.uid,
      idea: targetIdea,
      allIdeasPool: ideas,
      onToast: showToast
    });
  };

  const handleAdvanceStatus = async (id: string, newStatus: StatusType) => {
    if (!user) return;
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    
    await saveIdeaToFirebase(user.uid, {
      ...idea,
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const handleToggleFavorite = async (id: string) => {
    if (!user) return;
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;

    await saveIdeaToFirebase(user.uid, {
      ...idea,
      isFavorite: !idea.isFavorite,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeleteIdea = async (id: string) => {
    if (!user) return;
    await deleteIdeaFromFirebase(user.uid, id);
    if (selectedIdea && selectedIdea.id === id) setSelectedIdea(null);
  };

  const handleUpdateIdea = async (updated: IdeaItem) => {
    if (!user) return;
    await saveIdeaToFirebase(user.uid, updated);
    if (selectedIdea && selectedIdea.id === updated.id) setSelectedIdea(updated);
  };

  const handleGeneratePlanForIdea = async (idea: IdeaItem) => {
    if (!user) return;
    setIsGeneratingPlan(true);
    try {
      const plan = await requestAiActionPlan(idea.rawInput, idea.domain, idea.title);
      const updated: IdeaItem = {
        ...idea,
        actionPlan: plan,
        tags: Array.from(new Set([...idea.tags, ...plan.tags])),
        updatedAt: new Date().toISOString(),
      };
      await handleUpdateIdea(updated);
    } catch (err) {
      console.error('Failed to generate action plan:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleResetToRealProjects = async () => {
    if (!user) return;
    setIdeas(REAL_USER_PROJECTS);
    await seedRealProjectsToFirebase(user.uid);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 animate-spin flex items-center justify-center">
          <span className="text-slate-950 font-black text-xl">Ω</span>
        </div>
        <p className="text-slate-400 font-medium animate-pulse">OmniFocus Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="space-y-3 max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-500 flex items-center justify-center text-slate-950 font-black text-4xl shadow-2xl mx-auto mb-6">
            Ω
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">OmniFocus <span className="text-slate-500 font-normal">Idea OS</span></h1>
          <p className="text-slate-400 leading-relaxed">
            Fikirlerinizi organize edin, AI ile aksiyon planları oluşturun ve pazar araştırması yapın. Başlamak için Google ile oturum açın.
          </p>
        </div>
        
        <button 
          onClick={handleLogin}
          className="flex items-center gap-3 px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl transition-all active:scale-95 shadow-xl"
        >
          <LogIn className="w-5 h-5" />
          <span>Google ile Giriş Yap</span>
        </button>

        <div className="text-slate-600 text-xs font-medium uppercase tracking-widest">
          Sadece sizin erişebileceğiniz güvenli veri merkezi
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Toast Notification Banner */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top duration-200 ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
            : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-slate-900/95 border-amber-500/40 text-slate-100'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <TopBar
        onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenKeywords={() => setIsKeywordsOpen(true)}
        totalIdeasCount={ideas.length}
        activeDomain={activeDomain}
        pendingRemindersCount={pendingRemindersCount}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeDomain={activeDomain}
          onSelectDomain={(d) => {
            setActiveDomain(d);
            setActiveStatusFilter('all');
          }}
          activeStatusFilter={activeStatusFilter}
          onSelectStatusFilter={setActiveStatusFilter}
          showFavoritesOnly={showFavoritesOnly}
          onToggleFavoritesOnly={() => setShowFavoritesOnly((prev) => !prev)}
          viewMode={viewMode}
          onSelectViewMode={setViewMode}
          counts={counts}
          onResetToRealProjects={handleResetToRealProjects}
        />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <WorkspaceHeader
            activeDomain={activeDomain}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenQuickCapture={() => setIsQuickCaptureOpen(true)}
            filteredCount={filteredIdeas.length}
          />

          {viewMode === 'insights' ? (
            <InsightsPanel
              ideas={filteredIdeas}
              onSelectDomain={(d) => {
                setActiveDomain(d);
                setViewMode('kanban');
              }}
              onSelectStatus={(s) => {
                setActiveStatusFilter(s);
                setViewMode('kanban');
              }}
            />
          ) : viewMode === 'timeline' ? (
            <TimelineView
              ideas={filteredIdeas}
              onSelectIdea={setSelectedIdea}
              onAdvanceStatus={handleAdvanceStatus}
              onToggleFavorite={handleToggleFavorite}
              onDeleteIdea={handleDeleteIdea}
              onGeneratePlan={handleRunPipelineForIdea}
            />
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              ideas={filteredIdeas}
              onSelectIdea={setSelectedIdea}
              onAdvanceStatus={handleAdvanceStatus}
              onToggleFavorite={handleToggleFavorite}
              onDeleteIdea={handleDeleteIdea}
              onGeneratePlan={handleRunPipelineForIdea}
              onQuickAddInStatus={(s) => setIsQuickCaptureOpen(true)}
            />
          ) : (
            <ListView
              ideas={filteredIdeas}
              onSelectIdea={setSelectedIdea}
              onAdvanceStatus={handleAdvanceStatus}
              onToggleFavorite={handleToggleFavorite}
              onDeleteIdea={handleDeleteIdea}
              onGeneratePlan={handleRunPipelineForIdea}
            />
          )}
        </main>
      </div>

      <QuickCaptureModal
        isOpen={isQuickCaptureOpen}
        onClose={() => setIsQuickCaptureOpen(false)}
        defaultDomain={activeDomain === 'all' ? 'etsy_pod' : activeDomain}
        onSaveIdea={handleSaveNewIdea}
        existingIdeas={ideas}
      />

      <IdeaDetailModal
        idea={selectedIdea}
        isOpen={!!selectedIdea}
        onClose={() => setSelectedIdea(null)}
        onUpdateIdea={handleUpdateIdea}
        onDeleteIdea={handleDeleteIdea}
        onRegeneratePlan={handleRunPipelineForIdea}
        isGeneratingPlan={isGeneratingPlan}
        onSpawnNewIdea={handleSaveNewIdea}
        ideasPool={ideas}
      />

      {user && (
        <KeywordRepositoryModal
          isOpen={isKeywordsOpen}
          onClose={() => setIsKeywordsOpen(false)}
          keywords={keywords}
          userId={user.uid}
        />
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        ideas={filteredIdeas}
        onImportIdeas={async (imported) => {
          if (!user) return;
          for (const idea of imported) await saveIdeaToFirebase(user.uid, idea);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ideas={ideas}
        onRestoreIdeas={async (restored) => {
          if (!user) return;
          for (const idea of restored) await saveIdeaToFirebase(user.uid, idea);
        }}
        user={user}
        accessToken={accessToken}
      />

      <ReminderBanner
        ideas={ideas}
        onOpenIdea={setSelectedIdea}
        onUpdateIdea={handleUpdateIdea}
      />
    </div>
  );
}
