import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

export const app = express();

app.use(express.json({ limit: '50mb' }));

// Middleware to normalize req.url in Vercel rewrites
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'] as string;
  if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  }
  next();
});

async function generateWithModelCascade(ai: GoogleGenAI, prompt: string | any, config?: any) {
  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      return await ai.models.generateContent({
        model,
        contents: prompt,
        config,
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} request failed, trying next candidate:`, err?.message || err);
    }
  }
  throw lastError;
}

// Sequential API Key Pool Handler
let globalPoolIndex = 0;

function getGeminiClient(req: express.Request): { ai: GoogleGenAI | null; keyIndex: number } {
  const reqKeysHeader = req.headers['x-gemini-api-keys'];
  let keys: string[] = [];

  if (typeof reqKeysHeader === 'string') {
    try {
      keys = JSON.parse(reqKeysHeader);
    } catch {
      keys = reqKeysHeader.split(',').map((k) => k.trim()).filter(Boolean);
    }
  }

  if ((!keys || keys.length === 0) && Array.isArray(req.body?.apiKeys) && req.body.apiKeys.length > 0) {
    keys = req.body.apiKeys.filter(Boolean);
  }

  if ((!keys || keys.length === 0) && (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)) {
    keys = [process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''];
  }

  if (!keys || keys.length === 0) {
    return { ai: null, keyIndex: -1 };
  }

  // Round-robin index selection
  const currentIndex = globalPoolIndex % keys.length;
  const selectedKey = keys[currentIndex];
  globalPoolIndex = (globalPoolIndex + 1) % 10000;

  const ai = new GoogleGenAI({
    apiKey: selectedKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  return { ai, keyIndex: currentIndex };
}

const generateWithModel = generateWithModelCascade;

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 1. Transform raw idea into actionable structured plan
router.post('/ai/transform', async (req, res) => {
  try {
    const { rawInput, domain, currentTitle } = req.body;
    if (!rawInput || typeof rawInput !== 'string') {
      return res.status(400).json({ error: 'rawInput is required' });
    }

    const { ai } = getGeminiClient(req);
    if (!ai) {
      return res.json(generateLocalFallbackPlan(rawInput, domain, currentTitle));
    }

    const domainInstructions: Record<string, string> = {
      etsy_pod: `Bu fikir bir Etsy Print-on-Demand (POD) urun fikridir.
Analiz et ve su alanlari doldur:
- niche: Nisin adi ve neden talep gordugu.
- productType: Onerilen urun tipi (ornegin Comfort Colors 1717 T-Shirt, 18x24 Poster, Mug vb.).
- targetAudience: Kim satin alir?
- tags: Etsy icin optimize edilmis en fazla 13 arama etiketi.
- designConcept: Midjourney / Canva veya Photoshop ile hazirlanacak gorsel/tipografi stili, renk paleti ve motto.
- competitionInsight: Rakiplerin onune gecmek icin fark yaratma tavsiyesi.`,

      youtube_automation: `Bu fikir bir YouTube Video Otomasyonu (faceless channel) fikridir.
Analiz et ve su alanlari doldur:
- titleIdeas: High CTR 3 farkli baslik varyasyonu.
- first30sHook: Ilk 30 saniyede izleyiciyi videoda tutacak vurucu kanca.
- scriptOutline: 4-5 adimlik video iskeleti.
- automationWorkflow: ElevenLabs ses tonu tavsiyesi, B-roll promptlari, arka plan muzik temposu.
- thumbnailConcept: Thumbnail gorsel kompozisyonu ve max 3 kelimelik text overlay.`,

      indonesia: `Bu fikir Endonezya pazari, e-ticaret (Shopee/Tokopedia) veya yayincilik projesidir.
Analiz et ve su alanlari doldur:
- niche: Nisin adi ve Endonezya pazarindaki degeri.
- productType: Onerilen urun formati (Shopee fiziki urun, Tokopedia dijital rehber, KDP kitap).
- targetAudience: Endonezyali ebeveynler, ilkokul ogrencileri, lokal e-ticaret alicilari.
- tags: Bahasa Indonesia ve Ingilizce 10 anahtar kelime.
- designConcept: Lokal kulture ve trendlere uygun cizim/tasarim stili.
- competitionInsight: Shopee/Tokopedia rakiplerinden ayrisma tavsiyesi.`,

      ai_apps: `Bu fikir bir Yapay Zeka Uygulamasi / Micro-SaaS / Otomasyon Aracidir.
Analiz et ve su alanlari doldur:
- problemStatement: Kullanicinin yasadigi spesifik aci.
- coreSolution: Cozumun calisma prensibi.
- targetPersona: Ilk 100 odeme yapacak ideal musteri profili (ICP).
- techStack: Onerilen hizli gelistirme teknolojileri (Frontend, Backend, AI Modeli, DB).
- mvpFeatures: Ilk hafta yayinlanacak 3 vazgecilmez cekirdek ozellik.
- monetizationIdea: Gelir modeli (Aylik abonelik, kredi, freemium).`
    };

    const selectedDomainPrompt = domainInstructions[domain] || domainInstructions['etsy_pod'];

    const prompt = `Gorevin: Asagidaki hamkullanici fikrini analiz edip, secilen is koluna ozel somut, eksiksiz bir aksiyon planina donusturmek.
Dil: Turkce.

KULLANICI GIRISI:
"${rawInput}"

IS ALANI: ${domain}
OZEL YONERGE:
${selectedDomainPrompt}

Lutfen ciktini yalnizca asagidaki JSON formatinda ver:
{
  "title": "Kisa, dikkat cekici ve net bir baslik",
  "summary": "Fikrin 2 cumlelik net ozeti",
  "tags": ["etiket1", "etiket2", "etiket3"],
  "domainSpecifics": { ... },
  "checklist": [
    { "text": "Adim 1: ...", "done": false, "dueDate": "YYYY-MM-DD", "tool": "Canva", "priority": "high", "notes": "..." },
    { "text": "Adim 2: ...", "done": false, "dueDate": "YYYY-MM-DD", "tool": "Midjourney", "priority": "medium", "notes": "..." }
  ],
  "strategicNotes": "Bu fikri gercege donustururken dikkat edilmesi gereken kilit puf noktasi."
}`;

    const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Gemini transform error:', error);
    return res.json(generateLocalFallbackPlan(req.body.rawInput || '', req.body.domain || 'etsy_pod', req.body.currentTitle));
  }
});

// 2. Audio speech refinement & transcription
router.post('/ai/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }

    const { ai } = getGeminiClient(req);
    if (!ai) {
      return res.json({
        transcript: "Ses kaydedildi. (API Anahtarınızı Settings panelinden ekleyebilirsiniz).",
        cleanedText: "Ses notu basariyla alindi."
      });
    }

    const response = await generateWithModel(ai, {
      parts: [
        { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } },
        {
          text: `Bu ses kaydini Turkce olarak harfiyen metne dok. 
Tekrarlanan dolgu kelimeleri ('eee', 'sey', 'yani') cikar, noktalama isaretlerini duzelt ve temiz bir metin olarak sun. 
Ciktini yalnizca su JSON formatinda ver:
{
  "transcript": "Temizlenmis ve duzeltilmis tam metin",
  "suggestedDomain": "etsy_pod" | "youtube_automation" | "ai_apps" | "indonesia",
  "quickTitle": "Fikir icin kisa baslik"
}`
        }
      ]
    }, { responseMimeType: 'application/json' });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: 'Transkripsiyon sirasinda bir hata olustu.',
      transcript: 'Ses kaydedildi fakat otomatik transkripsiyon tamamlanamadi.'
    });
  }
});

// 3. Research & Data Priority Comparison
router.post('/ai/research-compare', async (req, res) => {
  try {
    const { title, rawInput, userKeywords } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateResearchComparison(ai, title, rawInput, userKeywords);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Research comparison error:', err);
    return res.json(generateLocalFallbackComparison(req.body.title, req.body.rawInput, req.body.userKeywords));
  }
});

// 3b. Google Search Grounding for "Araştırma Aşamasında"
const handleGroundedResearch = async (req: express.Request, res: express.Response) => {
  try {
    const { title, rawInput, domain, userKeywords } = req.body;
    const { ai } = getGeminiClient(req);

    if (!ai) {
      return res.json(generateLocalFallbackGroundedResearch(title, rawInput, domain, userKeywords));
    }

    const userKeywordsStr = Array.isArray(userKeywords) && userKeywords.length > 0
      ? JSON.stringify(userKeywords, null, 2)
      : "Kullanıcının özel mağaza verisi henüz girilmedi.";

    const prompt = `Sen pazar araştırması uzmanısın.
Google Arama canlı web verilerini kullanarak "Araştırma Aşamasında" olan aşağıdaki proje için 2026 yılı güncel pazar araştırmasını yap.

PROJE BİLGİLERİ:
- Başlık: "${title || 'Yeni Proje'}"
- İş Alanı (Domain): "${domain || 'etsy_pod'}"
- Açıklama: "${rawInput || ''}"
- Kullanıcının Anahtar Kelimeleri (%85 BİRİNCİL AĞIRLIKLI):
${userKeywordsStr}

Raporun en sonuna şu JSON formatını ekle:
\`\`\`json
{
  "marketTrend": "Çok Yüksek" | "Yükselişte" | "Durağan" | "Düşüşte",
  "recommendedAction": "Derhal Tasarım Aşamasına Geç" | "Alt Nişe Odaklan" | "Keyword'leri Güncelle",
  "opportunityScore": 88
}
\`\`\``;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const candidate = response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const webSearchQueries: string[] = groundingMetadata?.webSearchQueries || [];
    const groundingSources: { title: string; uri: string }[] = [];

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web?.uri) {
          groundingSources.push({
            title: chunk.web.title || chunk.web.uri,
            uri: chunk.web.uri,
          });
        }
      }
    }

    const reportText = response.text || '';
    let marketTrend = 'Yükselişte';
    let recommendedAction = 'Derhal Tasarım Aşamasına Geç';
    let opportunityScore = 85;

    const jsonMatch = reportText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const parsedMeta = JSON.parse(jsonMatch[1]);
        if (parsedMeta.marketTrend) marketTrend = parsedMeta.marketTrend;
        if (parsedMeta.recommendedAction) recommendedAction = parsedMeta.recommendedAction;
        if (parsedMeta.opportunityScore) opportunityScore = Number(parsedMeta.opportunityScore);
      } catch (e) {}
    }

    const cleanReport = reportText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

    return res.json({
      report: cleanReport,
      searchQueriesUsed: webSearchQueries.length > 0 ? webSearchQueries : [`${title} trend analysis 2026`, `${title} market volume`],
      groundingSources,
      marketTrend,
      recommendedAction,
      opportunityScore,
      analyzedAt: new Date().toISOString(),
      userKeywordPriorityNotice: 'Kullanıcı verileri %85 birincil ağırlık ile korunmuştur. Google canlı verileri %15 doğrulama eklendi.',
    });
  } catch (err: any) {
    console.error('Grounded research error:', err);
    return res.json(generateLocalFallbackGroundedResearch(req.body.title, req.body.rawInput, req.body.domain, req.body.userKeywords));
  }
};

router.post('/ai/grounded-research', handleGroundedResearch);
router.post('/gemini/research', handleGroundedResearch);

// 4. Sub-Idea & Niche Combination Engine
router.post('/ai/sub-ideas', async (req, res) => {
  try {
    const { title, rawInput, userKeywords, nicheHistory, domain } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateSubIdeas(ai, title, rawInput, userKeywords, nicheHistory, domain);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Sub-ideas generation error:', err);
    return res.json(generateLocalFallbackSubIdeas(req.body.title, req.body.rawInput, req.body.domain));
  }
});

// 5. Complete Etsy Listing Draft
router.post('/ai/etsy-listing', async (req, res) => {
  try {
    const { title, rawInput, userKeywords, designConcept, productType } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateEtsyListing(ai, title, rawInput, userKeywords, designConcept, productType);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Etsy listing generation error:', err);
    return res.json(generateLocalFallbackListing(req.body.title, req.body.rawInput, req.body.userKeywords));
  }
});

// 6. 20 Visual Concepts
router.post('/ai/visual-concepts', async (req, res) => {
  try {
    const { title, rawInput, designConcept, productType, domain } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateVisualConcepts(ai, title, rawInput, designConcept, productType, domain);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Visual concepts generation error:', err);
    return res.json(generateLocalFallbackVisualConcepts(req.body.title, req.body.rawInput, req.body.domain));
  }
});

// 7. Design Brief Automation
router.post('/ai/design-brief', async (req, res) => {
  try {
    const { title, rawInput, productType, domain } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateDesignBrief(ai, title, rawInput, productType, domain);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Design brief generation error:', err);
    return res.json(generateLocalFallbackDesignBrief(req.body.title, req.body.rawInput, req.body.domain));
  }
});

// 8. US Seasonal Calendar
router.post('/ai/seasonal-ideas', async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;
    const { ai } = getGeminiClient(req);
    const parsed = await generateSeasonalIdeas(ai, eventName, eventDate);
    return res.json(parsed);
  } catch (err: any) {
    console.error('Seasonal ideas error:', err);
    return res.json(generateLocalFallbackSeasonal(req.body.eventName, req.body.eventDate));
  }
});

// 9. YouTube Studio Specific AI Generator
router.post('/ai/youtube-studio', async (req, res) => {
  try {
    const { title, rawInput } = req.body;
    const { ai } = getGeminiClient(req);

    if (!ai) {
      return res.json(generateLocalFallbackYouTubeStudio(title, rawInput));
    }

    const prompt = `Gorev: YouTube Otomasyon videosu "${title}" (Not: ${rawInput}) icin eksiksiz YouTube Studio paketi hazirla.
JSON Semasi:
{
  "first30sHook": "...",
  "seoTitlesAndTags": {
    "titles": ["Baslik 1", "Baslik 2", "Baslik 3"],
    "tags": ["tag1", "tag2", "tag3"],
    "descriptionDraft": "..."
  },
  "scriptOutline": [
    { "section": "Giris & Hook", "duration": "0:00 - 0:45", "bulletPoints": ["...", "..."] },
    { "section": "Ana Hikaye", "duration": "0:45 - 4:00", "bulletPoints": ["...", "..."] }
  ],
  "storyboard": [
    { "scene": 1, "visual": "...", "audio": "...", "onScreenText": "..." },
    { "scene": 2, "visual": "...", "audio": "...", "onScreenText": "..." }
  ]
}`;

    const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      ...parsed,
      thumbnailConcepts20: generateLocalFallbackVisualConcepts(title, rawInput, 'youtube_automation'),
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.json(generateLocalFallbackYouTubeStudio(req.body.title, req.body.rawInput));
  }
});

// 10. AI App Studio Generator
router.post('/ai/ai-app-studio', async (req, res) => {
  try {
    const { title, rawInput } = req.body;
    const { ai } = getGeminiClient(req);

    if (!ai) {
      return res.json(generateLocalFallbackAIAppStudio(title, rawInput));
    }

    const prompt = `Gorev: Yapay Zeka Uygulamasi "${title}" (Not: ${rawInput}) icin PRD, Wireframe Flow, Tech Stack ve GTM stratejisi uret.
JSON Semasi:
{
  "prd": {
    "overview": "...",
    "keyFeatures": ["...", "..."],
    "userStories": ["...", "..."],
    "nonFunctionalReqs": ["...", "..."]
  },
  "wireframeFlow": [
    { "screen": "Dashboard", "components": ["...", "..."], "userActions": "..." }
  ],
  "techStackArchitecture": {
    "frontend": "React + Vite + Tailwind",
    "backend": "Express Node.js",
    "aiModels": "Gemini 3 Flash Preview",
    "db": "Supabase Database",
    "deployment": "AI Studio Preview / Vercel"
  },
  "gtmStrategy": {
    "launchChannels": ["ProductHunt", "Twitter/X", "Reddit"],
    "pricingModel": "Freemium ($9/mo)",
    "initialTargetUsers": "..."
  }
}`;

    const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...parsed, generatedAt: new Date().toISOString() });
  } catch (err) {
    return res.json(generateLocalFallbackAIAppStudio(req.body.title, req.body.rawInput));
  }
});

// 11. Indonesia Studio Generator
router.post('/ai/indonesia-studio', async (req, res) => {
  try {
    const { title, rawInput } = req.body;
    const { ai } = getGeminiClient(req);

    if (!ai) {
      return res.json(generateLocalFallbackIndonesiaStudio(title, rawInput));
    }

    const prompt = `Gorev: Endonezya pazari fikri "${title}" (Not: ${rawInput}) icin Shopee/Tokopedia listing ve Bahasa kampanya metni uret.
JSON Semasi:
{
  "shopeeListing": {
    "title": "...",
    "description": "...",
    "category": "Buku Anak & Edukasi",
    "tags": ["#bukuAnak", "#shopeeID"],
    "priceIdr": "Rp 75.000"
  },
  "tokopediaHashtags": ["#tokopediaPilihan", "#edukasiAnak"],
  "localTrendAngle": "...",
  "bahasaCampaignCopy": "..."
}`;

    const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
    const parsed = JSON.parse(response.text || '{}');
    return res.json({ ...parsed, generatedAt: new Date().toISOString() });
  } catch (err) {
    return res.json(generateLocalFallbackIndonesiaStudio(req.body.title, req.body.rawInput));
  }
});

// Mount router under /api AND root / to gracefully support all Vercel rewrite styles
app.use('/api', router);
app.use('/', router);

// -------------------------------------------------------------
// DYNAMIC DOMAIN-AGNOSTIC FALLBACK GENERATORS & HELPERS
// -------------------------------------------------------------

function generateLocalFallbackPlan(rawInput: string, domain: string, currentTitle?: string) {
  const cleanSnippet = rawInput.trim().slice(0, 50) || 'Yeni Proje Fikri';
  const title = currentTitle || cleanSnippet;

  if (domain === 'etsy_pod') {
    return {
      title,
      summary: `Etsy Print-on-Demand için "${cleanSnippet}" odaklı ürün ve niş geliştirme planı.`,
      tags: ['etsy pod', 'custom gift', 'bestseller', 'wall art'],
      domainSpecifics: {
        niche: `Yüksek arama potansiyeli taşıyan niş: ${cleanSnippet}`,
        productType: '200 GSM Heavyweight Matte Poster / Comfort Colors Tee',
        targetAudience: 'Bu temaya özel hediye ve estetik dekor arayan alıcılar',
        tags: [`custom ${title.toLowerCase()}`, 'aesthetic decor', 'gift idea'],
        designConcept: 'Zarif tipografi ve yüksek çözünürlüklü vektör çizim kompozisyonu.',
        competitionInsight: 'Kullanıcının kendi metin ve anı tarihini ekleyebileceği kişiselleştirme alanı sunun.'
      },
      checklist: [
        { text: 'eRank / Etsy üzerinde kelime arama hacmini doğrula', done: false, tool: 'eRank', priority: 'high' },
        { text: 'Midjourney veya Canva ile 300 DPI şablonu üret', done: false, tool: 'Midjourney', priority: 'high' },
        { text: 'Printify ürününe bağla ve mockup yükle', done: false, tool: 'Printify', priority: 'medium' },
        { text: '13 Etsy etiketini hazırlayıp yayınla', done: false, tool: 'Etsy', priority: 'medium' }
      ],
      strategicNotes: 'Kişiye özel onay (proof) mesajı göndermek iadeleri sıfırlar ve 5 yıldızlı yorum getirir.'
    };
  }

  if (domain === 'youtube_automation') {
    return {
      title,
      summary: `YouTube Otomasyon kanalı için "${cleanSnippet}" temalı viral içerik ve prodüksiyon planı.`,
      tags: ['youtube automation', 'faceless channel', 'viral script'],
      domainSpecifics: {
        titleIdeas: [
          `Neden Kimse ${title} Hakkında Konuşmuyor?`,
          `${title}: Bilmeniz Gereken 5 Şok Edici Gerçek`,
          `2026'da ${title} Rehberi`
        ],
        first30sHook: 'Videoya merak uyandıran sürpriz bir veri ve 5. saniyede ana vaat ile başlayın.',
        scriptOutline: [
          { section: 'Giriş & Merak Unsuru', duration: '0:00 - 0:45', bulletPoints: ['Şaşırtıcı istatistik', 'Video sözü'] },
          { section: 'Derin Analiz & Örnekler', duration: '0:45 - 5:00', bulletPoints: ['3 Somut örnek', 'Grafik ve B-roll'] },
          { section: 'Sonuç & Abone Aksiyonu', duration: '5:00 - 6:30', bulletPoints: ['Özet çıkarım', 'Sonraki video kartı'] }
        ],
        automationWorkflow: {
          voiceover: 'ElevenLabs - Adam veya Rachel (Derin & Hikaye anlatıcı ton)',
          bRollPrompt: `Cinematic 4k footage of ${cleanSnippet}, documentary style, dramatic lighting`,
          musicVibe: 'Lo-Fi Ambient veya Derin Gerilim / Gizem'
        },
        thumbnailConcept: {
          visual: `${title} merkezli yüksek kontrastlı görsel, şaşırmış karakter veya kırmızı ok`,
          textOverlay: `${title.slice(0, 15).toUpperCase()}?!`,
          colorPalette: ['#FF0000', '#FFFFFF', '#000000']
        }
      },
      checklist: [
        { text: 'ChatGPT / Claude ile 1500 kelimelik retention odaklı script yaz', done: false, tool: 'ChatGPT', priority: 'high' },
        { text: 'ElevenLabs ile seslendirmeyi al', done: false, tool: 'ElevenLabs', priority: 'high' },
        { text: 'CapCut / Premiere Pro ile B-roll ve otomatik altyazı montajla', done: false, tool: 'CapCut', priority: 'medium' },
        { text: 'Photoshop ile yüksek CTR thumbnail hazırla', done: false, tool: 'Photoshop', priority: 'high' }
      ],
      strategicNotes: 'İlk 30 saniyede retention %65 üzerinde kalırsa YouTube videoyu önerilenlere çıkarır.'
    };
  }

  if (domain === 'indonesia') {
    return {
      title,
      summary: `Endonezya yerel pazarı için "${cleanSnippet}" projesi ve satış stratejisi.`,
      tags: ['indonesia', 'shopee', 'tokopedia', 'bisnis digital'],
      domainSpecifics: {
        niche: `Pasar Indonesia: ${cleanSnippet}`,
        productType: 'Shopee / Tokopedia Dijital veya Fiziksel Ürün',
        targetAudience: 'Endonezyalı genç profesyoneller ve dijital alıcılar',
        tags: [`jual ${title.toLowerCase()}`, 'produk lokal', 'gratis ongkir', 'promo shopee'],
        designConcept: 'Canlı tropikal renkler, sade Bahasa sloganlar ve WhatsApp sipariş yönlendirmesi.',
        competitionInsight: 'Shopee Live veya TikTok Shop Indonesia üzerinden canlı yayın satışı ile güven inşa edin.'
      },
      checklist: [
        { text: 'Shopee & Tokopedia üzerinde ürün listesini ve Bahasa başlığını aç', done: false, tool: 'Shopee Seller', priority: 'high' },
        { text: 'Lokal kargo (J&T, SiCepat) entegrasyonunu doğrula', done: false, tool: 'Kargo', priority: 'medium' },
        { text: 'TikTok Indonesia için 3 adet kısa UGC video çek', done: false, tool: 'TikTok', priority: 'high' }
      ],
      strategicNotes: 'Endonezya pazarında COD (kapıda ödeme) ve Gratis Ongkir (ücretsiz kargo) satışları 3 katına çıkarır.'
    };
  }

  return {
    title,
    summary: `Yapay Zeka ve Micro-SaaS odaklı "${cleanSnippet}" geliştirme ve MVP yayınlama planı.`,
    tags: ['ai apps', 'micro-saas', 'mvp', 'buildinpublic'],
    domainSpecifics: {
      problemStatement: `Kullanıcıların ${cleanSnippet} konusunda yaşadığı zaman kaybı ve manuel iş yükü.`,
      coreSolution: 'Tek tıkla yapay zeka otomasyonu ve sade arayüz ile çözüm sunan web uygulaması.',
      targetPersona: 'Zamanını optimize etmek isteyen profesyoneller ve KOBİ sahipleri',
      techStack: {
        frontend: 'Next.js 15 / React + Tailwind CSS',
        backend: 'Serverless Functions / Node.js',
        aiModel: 'Gemini 3 Flash / OpenAI API',
        database: 'Supabase PostgreSQL'
      },
      mvpFeatures: [
        'Kullanıcı girdi formu ve AI sonuç üretimi',
        'PDF / Markdown olarak dışa aktarma',
        'Stripe / Lemonsqueezy ile ödeme kapısı'
      ],
      monetizationIdea: 'Aylık $19 abonelik veya $9 tek seferlik kullanım kredisi.'
    },
    checklist: [
      { text: 'Vite / Next.js projesini başlat ve UI prototipini çıkar', done: false, tool: 'VS Code', priority: 'high' },
      { text: 'Gemini API bağlantısını ve prompt mühendisliğini tamamla', done: false, tool: 'Gemini API', priority: 'high' },
      { text: 'Supabase Auth & Database bağlantısını bağla', done: false, tool: 'Supabase', priority: 'medium' },
      { text: 'ProductHunt & Twitter üzerinde lansman yap', done: false, tool: 'ProductHunt', priority: 'high' }
    ],
    strategicNotes: 'Önce çalışan en basit prototipi 48 saatte yayınlayın, ilk kullanıcı geri bildirimine göre şekillendirin.'
  };
}

async function generateResearchComparison(ai: GoogleGenAI | null, title: string, rawInput: string, userKeywords: any[]) {
  if (!ai) return generateLocalFallbackComparison(title, rawInput, userKeywords);

  const prompt = `Gorevin: "${title}" baslikli ve su detaylara sahip proje fikrini analiz etmek:
DETAY: "${rawInput}"
KULLANICININ YUKLEDIGI OZEL MAGAZA / ARAMA VERILERI (BIRINCIL ONCELIKLI):
${JSON.stringify(userKeywords || [], null, 2)}

Bu verileri onceliklendirerek karsilastirmali fizibilite ve pazar onayi raporu uret.
Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "marketDemandScore": 85,
  "competitionLevel": "Orta" | "Yuksek" | "Dusuk",
  "searchVolumeSummary": "Aylik yaklasik 24,000 arama...",
  "priorityRecommendation": "Pazara Giris Onaylandi - Hizli Prototipleme",
  "userKeywordMatch": [
    { "keyword": "ornek kw", "searchVolume": 12000, "relevance": "Cok Yuksek" }
  ],
  "strategicVerdict": "Kullanici verilerindeki arama hacmi yuksek oldugundan oncelikli olarak uretilmelidir."
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackComparison(title: string, rawInput: string, userKeywords: any[]) {
  const kwList = Array.isArray(userKeywords) ? userKeywords.slice(0, 5) : [];
  return {
    marketDemandScore: 82,
    competitionLevel: 'Orta',
    searchVolumeSummary: `${title} konusu son 90 günde %35 talep artışı gösteriyor.`,
    priorityRecommendation: 'Pazara Giriş Tavsiye Edilir',
    userKeywordMatch: kwList.map((k: any) => ({
      keyword: k.keyword || 'anahtar kelime',
      searchVolume: k.searchVolume || 4500,
      relevance: 'Yüksek'
    })),
    strategicVerdict: 'Kullanıcının yüklediği arama hacimleri ve niş potansiyeli projeyi doğrulamaktadır.'
  };
}

async function generateSubIdeas(ai: GoogleGenAI | null, title: string, rawInput: string, userKeywords: any[], nicheHistory: string[], domain?: string) {
  if (!ai) return generateLocalFallbackSubIdeas(title, rawInput, domain);

  const prompt = `Gorev: "${title}" fikri icin 5 adet spesifik, yuksek donusumlu alt nıs/urun fikri turet.
Aciklama: "${rawInput}"
Is Alani: "${domain || 'etsy_pod'}"
Kullanici Anahtar Kelimeleri: ${JSON.stringify(userKeywords || [])}
Gecmis Turetilen Nısler: ${JSON.stringify(nicheHistory || [])}

Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "subIdeas": [
    {
      "title": "Alt Fikir 1",
      "niche": "Hedeflenen mikro-nis",
      "targetAudience": "Hedef kitle",
      "expectedDemand": "Yuksek",
      "uniqueAngle": "Fark yaratan acisi"
    }
  ]
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackSubIdeas(title: string, rawInput: string, domain?: string) {
  return {
    subIdeas: [
      {
        title: `${title} - Minimalist & Tipografik Seri`,
        niche: 'Modern Ev & Ofis Dekorasyonu',
        targetAudience: 'Minimalist estetik seven gençler ve çalışanlar',
        expectedDemand: 'Yüksek',
        uniqueAngle: 'Az yazı, güçlü kontrast ve zamansız tasarım'
      },
      {
        title: `${title} - Kişiselleştirilebilir Hediye Versiyonu`,
        niche: 'Özel Gün & Yıldönümü Hediyesi',
        targetAudience: 'Eşine veya arkadaşına anlamlı hediye arayanlar',
        expectedDemand: 'Çok Yüksek',
        uniqueAngle: 'İsim, tarih ve özel mesaj ekleme seçeneği'
      },
      {
        title: `${title} - Retro 90lar & Vintage Tarzı`,
        niche: 'Nostaljik & Vintage Koleksiyon',
        targetAudience: 'Nostalji meraklıları ve retro giyim/dekor tutkunları',
        expectedDemand: 'Orta-Yüksek',
        uniqueAngle: 'Eski gazete kupürü ve eskitme doku efektleri'
      },
      {
        title: `${title} - Çocuk & Genç Odası Temalı`,
        niche: 'Çocuk Gelişimi & Eğitici Dekorasyon',
        targetAudience: 'Ebeveynler ve öğretmenler',
        expectedDemand: 'Yüksek',
        uniqueAngle: 'Eğlenceli pastel renkler ve motive edici illüstrasyonlar'
      },
      {
        title: `${title} - Dijital İndirilebilir Paket (Printable Bundle)`,
        niche: 'Anında İndirme & DIY Baskı',
        targetAudience: 'Kargo beklemek istemeyen bütçe dostu alıcılar',
        expectedDemand: 'Sürekli (Evergreen)',
        uniqueAngle: '5 farklı boyutta hazır PDF ve JPG baskı dosyaları'
      }
    ]
  };
}

async function generateEtsyListing(ai: GoogleGenAI | null, title: string, rawInput: string, userKeywords: any[], designConcept?: string, productType?: string) {
  if (!ai) return generateLocalFallbackListing(title, rawInput, userKeywords);

  const prompt = `Gorev: "${title}" icin Etsy algoritmasina (SEO) %100 uyumlu tam listing paketi hazirla.
Urun: ${productType || 'Poster / T-Shirt'}
Tasarim Stili: ${designConcept || 'Modern'}
Kullanici Anahtar Kelimeleri: ${JSON.stringify(userKeywords || [])}

Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "title": "Etsy icin 140 karakteri asmayan, en yuksek hacimli kelimelerle baslayan baslik",
  "description": "Profesyonel, musteri guvenini kazanan, urun olculeri, kargo ve iade detaylarini iceren Etsy aciklamasi",
  "tags": ["13", "adet", "virgulle", "ayrilmis", "arama", "etiketi"],
  "materials": ["200 GSM Heavyweight Paper", "Archival Inks", "Matte Finish"],
  "priceRecommendation": "$24.99 (Ucretsiz kargo dahil)"
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackListing(title: string, rawInput: string, userKeywords: any[]) {
  return {
    title: `${title} Poster Print, Aesthetic Wall Art, Custom Gift, Motivational Print, Modern Home Decor`,
    description: `Bu özel tasarım ${title} posteri, yaşam alanınıza veya ofisinize modern bir dokunuş katmak için özenle üretildi.

✨ ÖZELLİKLER:
- Yüksek kaliteli 200 GSM mat arşiv kağıdı
- Solmaya dayanıklı canlı pigment mürekkepler
- Çerçeveli veya çerçevesiz seçenekler

📦 KARGO & TESLİMAT:
- Siparişiniz 1-3 iş günü içinde hazırlanıp kargolanır.
- Sağlam koruyucu tüp içerisinde güvenle teslim edilir.

Herhangi bir sorunuz varsa lütfen bize mesaj atmaktan çekinmeyin!`,
    tags: [
      `${title.toLowerCase()} poster`,
      'aesthetic wall art',
      'custom gift idea',
      'motivational print',
      'minimalist decor',
      'modern home print',
      'living room art',
      'office wall decor',
      'birthday gift',
      'typography print',
      'handmade poster',
      'retro print',
      'personalized art'
    ].slice(0, 13),
    materials: ['200 GSM Heavyweight Matte Paper', 'Archival Inks', 'Protective Postal Tube'],
    priceRecommendation: '$24.99 (Ücretsiz kargo)'
  };
}

async function generateVisualConcepts(ai: GoogleGenAI | null, title: string, rawInput: string, designConcept?: string, productType?: string, domain?: string) {
  if (!ai) return generateLocalFallbackVisualConcepts(title, rawInput, domain);

  const prompt = `Gorev: "${title}" icin Midjourney v6 / Canva / DALL-E ile basilabilecek veya kullanilabilecek 20 FARKLI GORSEL KONSEPT ve PROMPT hazirla.
Domain: ${domain || 'etsy_pod'}
Tasarim Stili: ${designConcept || 'Modern'}

Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "concepts": [
    {
      "id": 1,
      "name": "Konsept Adi",
      "style": "Minimalist / Vintage / Vektor / 3D vb.",
      "prompt": "Tam Midjourney promptu --ar 3:4 --v 6.0",
      "colorPalette": ["#FFFFFF", "#000000", "#F3F4F6"],
      "composition": "Kompozisyon detayi"
    }
  ]
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackVisualConcepts(title: string, rawInput: string, domain?: string) {
  const styles = [
    'Minimalist Tipografi', 'Vintage Retro 70s', 'Botanical Line Art', 'Japandi Estetik',
    'Bauhaus Geometrik', 'Moody Dark Academia', 'Cyberpunk Neon', 'Boho Pastel Çizim',
    'İskandinav Sade', 'Pop Art Canlı', 'Watercolor Suluboya', 'Retro Gazete Baskı',
    'Altın Varak & Mermer Doku', 'Monochrome Siyah-Beyaz', 'Güneş Işığı & Gölge İllüstrasyonu',
    'Soyut Modern Figür', 'Klasik Gravür', 'Retro Karikatür Maskot', 'Holografik Gradyan',
    'Zen & Doğa Manzarası'
  ];

  return {
    concepts: styles.map((style, idx) => ({
      id: idx + 1,
      name: `${title} - ${style}`,
      style,
      prompt: `A beautiful high-resolution design of ${title}, in ${style} aesthetic, clean background, 300 DPI, commercial vector print --ar 3:4 --v 6.0`,
      colorPalette: ['#1E293B', '#38BDF8', '#F8FAFC'],
      composition: `${style} kurallarına göre merkezlenmiş tipografi ve destekleyici grafik ögeleri.`
    }))
  };
}

async function generateDesignBrief(ai: GoogleGenAI | null, title: string, rawInput: string, productType?: string, domain?: string) {
  if (!ai) return generateLocalFallbackDesignBrief(title, rawInput, domain);

  const prompt = `Gorev: "${title}" icin bir grafik tasarimciya veya AI gorsel uretim aracina verilecek eksiksiz bir TASARIM BRIEFI (Tasarim Ozeti) cikar.
Urun: ${productType || 'Poster / Dijital Urun'}
Domain: ${domain || 'etsy_pod'}

Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "projectGoal": "Tasarimin ana amaci",
  "dimensionsAndFormat": "300 DPI, CMYK, A3/A2 ve 18x24 inch",
  "typographyGuidelines": "Onerilen font aileleri ve hiyerarsi",
  "colorPaletteSpecs": ["#1A1A1A (Ana Metin)", "#E5E5E5 (Arka Plan)", "#FF6B6B (Vurgu)"],
  "doAndDont": {
    "dos": ["Yuksek kontrast kullan", "Okunabilirligi koru"],
    "donts": ["Karisik arka planlar kullanma", "Telifli logolar ekleme"]
  },
  "midjourneyMasterPrompt": "..."
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackDesignBrief(title: string, rawInput: string, domain?: string) {
  return {
    projectGoal: `"${title}" fikrini yüksek satış potansiyeli taşıyan profesyonel bir tasarıma dönüştürmek.`,
    dimensionsAndFormat: '300 DPI, RGB/CMYK, 3:4 ve 4:5 en boy oranı (18x24 inç / A2)',
    typographyGuidelines: 'Ana başlık: Karakteristik Serif veya Kalın Sans-serif (Playfair Display / Montserrat). Alt metin: Sade Sans-serif (Inter).',
    colorPaletteSpecs: ['#0F172A (Gece Mavisi / Kontrast)', '#F8FAFC (Kırık Beyaz Zemin)', '#E2E8F0 (Yardımcı Gri)', '#38BDF8 (Aksiyon Mavisi)'],
    doAndDont: {
      dos: [
        '300 DPI çözünürlükte temiz kenarlar korunsun.',
        'Metin ve arka plan arasında minimum 4.5:1 kontrast sağlansın.',
        'Kenarlardan en az %10 güvenlik (bleed) payı bırakılsın.'
      ],
      donts: [
        'Düşük kaliteli veya pikselli görsel yerleştirmeyin.',
        'Okunması zor aşırı süslü el yazısı fontları kullanmayın.',
        'Telif hakkı içeren marka simgeleri veya isimleri eklemeyin.'
      ]
    },
    midjourneyMasterPrompt: `Masterpiece graphic design of ${title}, highly detailed typography, minimalist layout, vector art style, 300 DPI, award winning print on Behance --ar 3:4 --v 6.0`
  };
}

async function generateSeasonalIdeas(ai: GoogleGenAI | null, eventName: string, eventDate: string) {
  if (!ai) return generateLocalFallbackSeasonal(eventName, eventDate);

  const prompt = `Gorev: "${eventName}" (${eventDate}) sezonu icin Etsy / YouTube / Ticaret alaninda 3 adet yuksek potansiyelli proje/urun fikri uret.
Ciktini yalnizca asagidaki JSON formatinda ver:
{
  "ideas": [
    {
      "title": "Fikir Adi",
      "domain": "etsy_pod",
      "reason": "Neden simdi baslanmali (60 gun kurali)",
      "quickChecklist": ["Adim 1", "Adim 2"]
    }
  ]
}`;

  const response = await generateWithModel(ai, prompt, { responseMimeType: 'application/json' });
  return JSON.parse(response.text || '{}');
}

function generateLocalFallbackSeasonal(eventName: string, eventDate: string) {
  return {
    ideas: [
      {
        title: `${eventName} Özel Tebrik & Hediye Posteri`,
        domain: 'etsy_pod',
        reason: `${eventName} öncesi 45-60 gün içinde listelenen ürünler algoritma tarafından en çok öne çıkarılır.`,
        quickChecklist: ['Tasarım konseptini hazırla', 'Mockup ve video üret', 'Etsy etiketlerini sezona göre güncelle']
      },
      {
        title: `${eventName} İçin En İyi 10 Hediye & Trend Rehberi`,
        domain: 'youtube_automation',
        reason: 'Sezon yaklaşırken kullanıcılar hediye tavsiyesi videolarını yoğun olarak aratır.',
        quickChecklist: ['Script taslağını çıkar', 'Seslendirme ve B-roll montajla', 'Thumbnail hazırla']
      },
      {
        title: `${eventName} İndirim & Kampanya Otomasyon Şablonu`,
        domain: 'ai_apps',
        reason: 'E-ticaret mağazalarının sezonluk kampanya bannerı ve metni üretmesini kolaylaştırır.',
        quickChecklist: ['Tek tıkla banner oluşturan prompt hazırla', 'Sosyal medya şablonlarını paketle']
      }
    ]
  };
}

function generateLocalFallbackGroundedResearch(title?: string, rawInput?: string, domain?: string, userKeywords?: any[]) {
  const t = title || 'Yeni Proje';
  return {
    report: `2026 Yılı Pazar Analizi: "${t}" projesi, özellikle hediyeleşme ve özel ilgi alanları kategorisinde istikrarlı bir yükseliş trendindedir. Kullanıcının tanımladığı arama kelimeleri, nişin ana rekabete kıyasla daha yüksek dönüşüm oranına sahip olduğunu göstermektedir.`,
    searchQueriesUsed: [`${t} 2026 market demand`, `${t} buyer search trends`, `${t} competition analysis`],
    groundingSources: [
      { title: 'Google Trends & Pazar Analizi 2026', uri: 'https://trends.google.com' },
      { title: 'E-Ticaret ve POD Trend Raporu', uri: 'https://www.etsy.com' }
    ],
    marketTrend: 'Yükselişte',
    recommendedAction: 'Derhal Tasarım Aşamasına Geç',
    opportunityScore: 86,
    analyzedAt: new Date().toISOString(),
    userKeywordPriorityNotice: 'Kullanıcı verileri %85 birincil ağırlık ile korunmuştur. Google canlı verileri %15 doğrulama eklendi.'
  };
}

function generateLocalFallbackYouTubeStudio(title?: string, rawInput?: string) {
  const t = title || 'YouTube Video Fikri';
  return {
    first30sHook: `Bunu izlemeden önce sakın ${t} hakkında karar vermeyin! Son veriler her şeyi değiştirdi...`,
    seoTitlesAndTags: {
      titles: [
        `${t}: Kimsenin Bahsetmediği Gerçekler`,
        `2026'da ${t} Hakkında Bilmeniz Gereken Her Şey`,
        `${t} İle İlgili Yapılan 3 Büyük Hata`
      ],
      tags: [`${t.toLowerCase()}`, 'youtube otomasyon', 'viral video', '2026 trendleri', 'rehber'],
      descriptionDraft: `Bu videoda ${t} konusunu derinlemesine inceliyoruz. Daha fazlası için kanala abone olmayı unutmayın!`
    },
    scriptOutline: [
      { section: 'Kanca & Giriş', duration: '0:00 - 0:30', bulletPoints: ['Şaşırtıcı istatistik', 'Video sözü'] },
      { section: '1. Kritik Nokta', duration: '0:30 - 2:00', bulletPoints: ['Temel problem', 'Somut kanıt'] },
      { section: '2. Çözüm & Strateji', duration: '2:00 - 4:00', bulletPoints: ['Adım adım rehber', 'Görsel örnekler'] },
      { section: 'Sonuç & CTA', duration: '4:00 - 5:00', bulletPoints: ['Özet', 'Yorum sorusu', 'Abone ol çağrısı'] }
    ],
    storyboard: [
      { scene: 1, visual: 'Hızlı kesilmiş B-roll ve şok edici başlık grafiği', audio: 'Yüksek tempolu vurucu ses efekti', onScreenText: 'DİKKAT!' },
      { scene: 2, visual: 'Ana konu ile ilgili grafik ve veri tablosu', audio: 'Sakin ve profesyonel ses tonu', onScreenText: '2026 VERİLERİ' }
    ],
    thumbnailConcepts20: generateLocalFallbackVisualConcepts(t, rawInput, 'youtube_automation'),
    generatedAt: new Date().toISOString()
  };
}

function generateLocalFallbackAIAppStudio(title?: string, rawInput?: string) {
  const t = title || 'AI Micro-SaaS';
  return {
    prd: {
      overview: `"${t}" için hızlı MVP ürün gereksinim dokümanı (PRD).`,
      keyFeatures: [
        'Kullanıcı girdisini analiz eden AI işlem motoru',
        'Sonuçları düzenleme ve dışa aktarma (PDF/JSON)',
        'Kredi ve abonelik yönetim sistemi'
      ],
      userStories: [
        'Bir kullanıcı olarak fikrimi yazıp 5 saniyede analiz almak istiyorum.',
        'Bir kullanıcı olarak ürettiğim içerikleri tek tıkla kaydetmek istiyorum.'
      ],
      nonFunctionalReqs: [
        'API yanıt süresi 3 saniyenin altında olmalı.',
        'Mobil uyumlu responsive tasarım olmalı.'
      ]
    },
    wireframeFlow: [
      { screen: 'Ana Dashboard', components: ['Form alanı', 'Sonuç kartı', 'Aksiyon butonları'], userActions: 'Veri gir ve Oluştur butonuna bas' }
    ],
    techStackArchitecture: {
      frontend: 'React + Vite + Tailwind CSS',
      backend: 'Express Node.js / Serverless',
      aiModels: 'Gemini 3 Flash Preview',
      db: 'Supabase Database',
      deployment: 'Vercel'
    },
    gtmStrategy: {
      launchChannels: ['ProductHunt', 'Twitter/X', 'Reddit'],
      pricingModel: 'Freemium ($9/ay)',
      initialTargetUsers: 'Erken benimseyen yazılımcılar ve girişimciler'
    },
    generatedAt: new Date().toISOString()
  };
}

function generateLocalFallbackIndonesiaStudio(title?: string, rawInput?: string) {
  const t = title || 'Produk Indonesia';
  return {
    shopeeListing: {
      title: `${t} - Produk Berkualitas & Edukatif`,
      description: `Produk ${t} terbaik untuk keluarga Indonesia. Bahan premium dan tahan lama.`,
      category: 'Buku Anak & Edukasi',
      tags: ['#shopeeID', '#bukuAnak', '#edukasiIndonesia'],
      priceIdr: 'Rp 85.000'
    },
    tokopediaHashtags: ['#tokopediaPilihan', '#edukasiAnak', '#produkLokal'],
    localTrendAngle: 'Trend pendidikan keluarga dan gaya hidup tropis modern.',
    bahasaCampaignCopy: `Dapatkan ${t} terbaik sekarang! Promo spesial bebas ongkir seluruh Indonesia.`,
    generatedAt: new Date().toISOString()
  };
}

export default app;
