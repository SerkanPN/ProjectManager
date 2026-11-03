import React, { useState } from 'react';
import { X, Upload, Plus, Database, Sparkles, Search, Trash2, ArrowUpRight, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { KeywordRepositoryItem } from '../types';
import { 
  saveKeywordToRepository, 
  deleteKeywordFromRepository, 
  parseCsvKeywords, 
  seedKeywordsToRepository,
  calculateKeywordWeight
} from '../services/keywordRepository';

interface KeywordRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: KeywordRepositoryItem[];
  userId: string;
}

export const KeywordRepositoryModal: React.FC<KeywordRepositoryModalProps> = ({
  isOpen,
  onClose,
  keywords,
  userId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newVolume, setNewVolume] = useState<number | ''>('');
  const [newResults, setNewResults] = useState<number | ''>('');
  const [newConvRate, setNewConvRate] = useState<number | ''>('');
  const [newTags, setNewTags] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  if (!isOpen) return null;

  const filteredKeywords = keywords.filter(k => 
    k.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (k.nicheTags && k.nicheTags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsvKeywords(text);
    if (parsed.length === 0) {
      alert('CSV formatı anlaşılamadı. Format: Keyword, Search Volume, Competition Results, Conversion Rate');
      return;
    }

    for (const item of parsed) {
      await saveKeywordToRepository(userId, item);
    }
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    await saveKeywordToRepository(userId, {
      keyword: newKeyword.trim(),
      searchVolume: Number(newVolume) || 0,
      competitionResults: Number(newResults) || 0,
      conversionRate: Number(newConvRate) || 0,
      nicheTags: newTags.split(',').map(t => t.trim()).filter(Boolean)
    });

    setNewKeyword('');
    setNewVolume('');
    setNewResults('');
    setNewConvRate('');
    setNewTags('');
    setIsAddingManual(false);
  };

  const handleSeedDefault = async () => {
    setIsSeeding(true);
    await seedKeywordsToRepository(userId);
    setIsSeeding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Merkezi Keyword Deposu (Etsy SEO Analytics)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {keywords.length} Kelime
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Arama hacmi, rekabet ve dönüşüm verilerini saklayın. Pipeline otomatik bağlanır ve ağırlıklı skorlama yapar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Actions */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Keyword veya niş etiket ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedDefault}
              disabled={isSeeding}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              title="Örnek yüksek dönüşümlü Etsy keyword paketini veritabanına ekler"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSeeding ? 'animate-spin' : ''}`} />
              <span>Varsayılan Paketi Yükle</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors cursor-pointer border border-slate-700/60">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV Yükle</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => setIsAddingManual(prev => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Manuel Kelime Ekle</span>
            </button>
          </div>
        </div>

        {/* Manual Add Form (Expandable) */}
        {isAddingManual && (
          <form onSubmit={handleManualSave} className="p-4 bg-slate-950 border-b border-amber-500/20 grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs animate-in slide-in-from-top duration-150">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Keyword / Arama Terimi</label>
              <input
                type="text"
                required
                placeholder="Örn: personalized spotify poster"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Arama Hacmi</label>
              <input
                type="number"
                placeholder="Örn: 24000"
                value={newVolume}
                onChange={(e) => setNewVolume(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Rakip Sonuç</label>
              <input
                type="number"
                placeholder="Örn: 1200"
                value={newResults}
                onChange={(e) => setNewResults(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">Dönüşüm Oranı (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Örn: 5.8"
                  value={newConvRate}
                  onChange={(e) => setNewConvRate(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-lg hover:bg-amber-300 transition-colors cursor-pointer shrink-0"
                >
                  Kaydet
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Keywords Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredKeywords.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Database className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500">Henüz kaydedilmiş kelime verisi bulunmuyor.</p>
              <button
                onClick={handleSeedDefault}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-sm hover:bg-amber-300 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Örnek Etsy Keyword Paketini Yükle</span>
              </button>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Search Term (Arama Terimi)</th>
                    <th className="py-3 px-3 font-mono">Hacim (Volume)</th>
                    <th className="py-3 px-3 font-mono">Rekabet</th>
                    <th className="py-3 px-3 font-mono">Dönüşüm %</th>
                    <th className="py-3 px-3 font-mono">Ağırlıklı Skor</th>
                    <th className="py-3 px-3 text-slate-500">Tarih</th>
                    <th className="py-3 px-3 text-right">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredKeywords.map((item) => {
                    const score = item.weightScore || calculateKeywordWeight(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-white flex items-center gap-2">
                          <span>{item.keyword}</span>
                          {item.nicheTags && item.nicheTags.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">
                              {item.nicheTags[0]}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-200">
                          {item.searchVolume?.toLocaleString() || 0}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {item.competitionResults?.toLocaleString() || 0}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-400 font-semibold">
                          %{item.conversionRate || 0}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            score >= 70
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : score >= 40
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                          }`}>
                            {score} / 100
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                          {item.uploadedAt?.slice(0, 10) || 'Yeni'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => deleteKeywordFromRepository(userId, item.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors rounded cursor-pointer"
                            title="Kelimeyi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
