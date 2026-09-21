import { KnowledgeDocument, KnowledgeUrl, RetrievedSource } from '../types';

const STORAGE_KEY_DOCS = 'omnichat_kb_documents_v1';
const STORAGE_KEY_URLS = 'omnichat_kb_urls_v1';

export const SEED_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: 'doc-return-policy',
    title: 'OmniCorp Customer Guarantee, Warranty & Return Policy',
    category: 'policy',
    tags: ['returns', 'warranty', 'refunds', 'shipping', 'customer service'],
    updatedAt: new Date('2026-08-15'),
    isActive: true,
    charCount: 2150,
    content: `OMNICORP OFFICIAL CUSTOMER GUARANTEE & RETURN POLICY (2026 Revision)

1. 30-DAY NO-QUESTIONS-ASKED RETURN WINDOW
Customers may return any OmniCorp hardware, peripheral, or accessory within 30 calendar days from the date of physical delivery for a 100% full refund to the original payment method. Items must include all original packaging, cables, and power adapters. We provide a prepaid shipping return label via our automated RMA (Return Merchandise Authorization) portal at returns.omnicorp.io.

2. TWO-YEAR COMPREHENSIVE HARDWARE WARRANTY
All OmniCorp electronic devices are covered by our 2-Year Limited Manufacturer Warranty against defects in materials, manufacturing workmanship, battery degradation below 80% capacity, and component failures.
- Year 1: Immediate advance replacement with a brand-new unit within 48 hours.
- Year 2: Free repair or certified factory recertification with expedited return shipping.
- Exclusions: Intentional physical trauma, catastrophic liquid submersion beyond IP68 ratings, or unauthorized third-party motherboard tampering.

3. REFUND TIMELINE & PROCESSING
Once the returned package is scanned by the logistics courier, refunds are triggered automatically. Bank account and credit card credits appear within 3 to 5 business days. Digital store credits and gift cards are reissued instantly.

4. RESTOCKING FEES & RETURN SHIPPING
- Defective or damaged items: $0 return shipping fee, $0 restocking fee.
- Buyer's remorse or accidental orders: Free return shipping provided for all registered OmniCorp Club members; standard $4.99 label deduction for guest checkouts. Zero restocking fees ever applied.

5. SUPPORT CHANNELS & ESCALATIONS
Contact support@omnicorp.io 24/7 or dial 1-800-555-OMNI. Chat support is staffed by both AI assistants and human tier-2 engineers.`
  },
  {
    id: 'doc-quantum-computing',
    title: 'Quantum Computing & Superposition Fundamentals',
    category: 'documentation',
    tags: ['quantum', 'physics', 'superposition', 'qubits', 'algorithms'],
    updatedAt: new Date('2026-07-20'),
    isActive: true,
    charCount: 2420,
    content: `QUANTUM COMPUTING: PRINCIPLES OF SUPERPOSITION, ENTANGLEMENT & ARCHITECTURE

1. CLASSICAL BITS VS. QUANTUM QUBITS
A classical computer encodes discrete information in binary bits (strictly 0 or 1). A quantum computer utilizes quantum bits (qubits), which can exist in a linear combination of states |ψ⟩ = α|0⟩ + β|1⟩, where α and β are complex probability amplitudes satisfying |α|² + |β|² = 1. This foundational principle is known as Superposition.

2. SUPERPOSITION & STATE SPACES
Superposition enables a quantum processor with N qubits to represent 2^N states simultaneously in Hilbert space. For instance:
- 10 qubits represent 1,024 simultaneous states.
- 50 qubits represent over 1 quadrillion states.
- 300 qubits exceed the total number of atoms in the observable universe.
However, upon measurement or observation, the quantum wave function collapses probabilistically into a single classical outcome.

3. QUANTUM ENTANGLEMENT & NON-LOCALITY
Entanglement occurs when quantum particles interact such that the quantum state of each particle cannot be described independently of the state of the others, regardless of physical separation distance. Entanglement is the vital resource powering quantum teleportation, superdense coding, and exponential algorithmic speedups.

4. REAL-WORLD QUANTUM ALGORITHMS
- Shor's Algorithm: Provides polynomial-time factorization of large integers O((log N)³), rendering standard RSA and ECC classical cryptography vulnerable and necessitating Post-Quantum Cryptography (PQC).
- Grover's Algorithm: Provides quadratic speedup O(√N) for unstructured database search.
- VQE (Variational Quantum Eigensolver): Hybrid quantum-classical optimization for molecular dynamics and pharmaceutical synthesis.

5. PHYSICAL REFRIGERATION & DECOHERENCE
Superconducting transmon qubits require cryogenic dilution refrigerators maintained at approximately 15 millikelvin (-273.135°C), colder than deep interstellar space, to avoid environmental thermal noise and quantum decoherence.`
  },
  {
    id: 'doc-astra-protocol',
    title: 'Astra Autonomous Agent Protocol Specification v4.2',
    category: 'guide',
    tags: ['astra', 'agent', 'architecture', 'security', 'autonomous'],
    updatedAt: new Date('2026-09-01'),
    isActive: true,
    charCount: 1980,
    content: `ASTRA AGENT PROTOCOL SPECIFICATION v4.2

1. CORE MISSION & REASONING MODEL
The Astra Agent is an autonomous multimodal execution engine designed to bridge natural language intent with verifiable system execution. It employs a 13-stage cyclic reasoning loop:
Intent Analysis → Decomposition → Security Risk Gate → Model Routing → Parallel Tool Invocation → State Verification → Reflection & Synthesized Output.

2. SECURITY SANDBOXING & PERMISSION GATES
All actions performed by Astra are classified into three strict permission tiers:
- LOW: Read-only operations, search queries, database select queries. Executed automatically.
- MEDIUM: Workspace file modifications, non-destructive API updates, caching operations. Monitored with audit log recording.
- HIGH: System shell commands, external API mutations, financial transactions, permanent file deletion. Requires explicit cryptographic confirmation or interactive UI modal approval from the end user.

3. MULTI-MODEL DYNAMIC ROUTER
Astra dynamically selects the optimal model per reasoning step:
- Gemini 3.1 Pro: Long-horizon planning, multi-step problem solving, and synthesis.
- Gemini 3.8 Flash / 3 Flash: Real-time multimodal vision, audio streaming, and high-frequency tool parsing.
- Claude 3.5 Sonnet / GPT-4o: Code refactoring, formal verification, and architectural validation.

4. LONG-TERM MEMORY & CONTEXT COMPACTION
Astra maintains two discrete memory tiers:
- Episodic Conversation Memory: Recalls in-flight topics, declared user preferences, and real-time constraints.
- Semantic Vector Memory: Cross-session persistent storage indexed in local Room DB and vector embeddings for continuous personalization.`
  },
  {
    id: 'doc-culinary-vinaigrette',
    title: 'Mediterranean Culinary Primer & Secret Vinaigrette Recipe',
    category: 'guide',
    tags: ['cooking', 'recipe', 'culinary', 'mediterranean', 'vinaigrette'],
    updatedAt: new Date('2026-06-10'),
    isActive: true,
    charCount: 1650,
    content: `THE ARTISAN MEDITERRANEAN VINAIGRETTE & SALAD EMULSIFICATION

1. THE GOLDEN RATIO OF DRESSINGS
The secret to a world-class vinaigrette is the classical 3:1 emulsion ratio:
- 3 parts cold-pressed Extra Virgin Olive Oil (Greek Koroneiki or Spanish Arbequina recommended)
- 1 part high-acid Aged Red Wine Vinegar (or fresh Meyer lemon juice)

2. THE SECRET EMULSIFIER & SEASONING
A true permanent emulsion requires an active emulsifying agent containing lecithin or mucilage:
- 1 teaspoon of French Dijon mustard (acts as the primary colloidal stabilizer)
- 1 medium clove of fresh garlic, finely microplaned or crushed into a paste
- 1 teaspoon of raw wildflower honey (balances the acetic bite)
- 1/2 teaspoon of dried wild Greek oregano (rubbed between palms to release aromatic oils)
- 1/4 teaspoon coarse sea salt and freshly cracked tellicherry black pepper

3. PREPARATION TECHNIQUE
Never pour the oil all at once. Whisk the vinegar, Dijon, garlic, honey, and salt together first in a glass bowl until dissolved. While whisking vigorously in a continuous figure-8 pattern, drizzle the olive oil in a slow, hair-thin stream until a glossy, velvety, mayonnaise-like emulsion forms.

4. STORAGE & PAIRING
Store in a sealed glass jar at room temperature for up to 3 days, or refrigerate for 2 weeks. Pair with crisp romaine, kalamata olives, heirloom tomatoes, and thick slabs of barrel-aged feta cheese.`
  }
];

export const SEED_URLS: KnowledgeUrl[] = [
  {
    id: 'url-omnichat-api',
    url: 'https://docs.omnichat.ai/api/v1',
    title: 'OmniChat Developer API & SDK Documentation',
    summary: 'REST and WebSocket endpoints for OmniChat multi-modal agent invocation, bearer token authentication, rate limit quotas (100 req/min), and real-time streaming interfaces.',
    content: `OmniChat API v1 Reference: Base URL https://api.omnichat.ai/v1. Headers: Authorization: Bearer <API_KEY>, Content-Type: application/json. Endpoints: POST /v1/chat/completions, POST /v1/embeddings, GET /v1/models. Rate limits: Standard tier 100 requests per minute, Enterprise tier 2,000 requests per minute. Supports Server-Sent Events (SSE) for streaming token output.`,
    isActive: true,
    addedAt: new Date('2026-08-01')
  },
  {
    id: 'url-mdn-js',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    title: 'MDN Web Docs — Modern JavaScript Guide',
    summary: 'Authoritative documentation for modern ECMAScript standards, asynchronous iterators, promises, TypedArrays, and Web API capabilities.',
    content: `MDN JavaScript Reference: Comprehensive documentation on ECMAScript modern standards. Covers async/await, generators, Array methods, modern Object manipulation, Set/Map collections, Web Workers, and WebAssembly integration.`,
    isActive: true,
    addedAt: new Date('2026-08-10')
  }
];

export class KnowledgeBaseService {
  public static getDocuments(): KnowledgeDocument[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DOCS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((d: any) => ({
          ...d,
          updatedAt: new Date(d.updatedAt)
        }));
      }
    } catch (e) {
      console.warn('Error reading documents from storage, using seed data', e);
    }
    this.saveDocuments(SEED_DOCUMENTS);
    return SEED_DOCUMENTS;
  }

  public static saveDocuments(docs: KnowledgeDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    } catch (e) {
      console.error('Error saving documents to storage', e);
    }
  }

  public static getUrls(): KnowledgeUrl[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_URLS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((u: any) => ({
          ...u,
          addedAt: new Date(u.addedAt)
        }));
      }
    } catch (e) {
      console.warn('Error reading URLs from storage, using seed data', e);
    }
    this.saveUrls(SEED_URLS);
    return SEED_URLS;
  }

  public static saveUrls(urls: KnowledgeUrl[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_URLS, JSON.stringify(urls));
    } catch (e) {
      console.error('Error saving URLs to storage', e);
    }
  }

  public static addDocument(doc: Omit<KnowledgeDocument, 'id' | 'updatedAt' | 'charCount'>): KnowledgeDocument {
    const docs = this.getDocuments();
    const newDoc: KnowledgeDocument = {
      ...doc,
      id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      updatedAt: new Date(),
      charCount: doc.content.length,
      isActive: doc.isActive !== undefined ? doc.isActive : true
    };
    docs.unshift(newDoc);
    this.saveDocuments(docs);
    return newDoc;
  }

  public static updateDocument(id: string, updates: Partial<KnowledgeDocument>): KnowledgeDocument | null {
    const docs = this.getDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) return null;
    
    const updated = {
      ...docs[index],
      ...updates,
      updatedAt: new Date(),
      charCount: updates.content ? updates.content.length : docs[index].charCount
    };
    docs[index] = updated;
    this.saveDocuments(docs);
    return updated;
  }

  public static deleteDocument(id: string): boolean {
    const docs = this.getDocuments();
    const filtered = docs.filter(d => d.id !== id);
    if (filtered.length !== docs.length) {
      this.saveDocuments(filtered);
      return true;
    }
    return false;
  }

  public static toggleDocumentActive(id: string): boolean {
    const docs = this.getDocuments();
    const doc = docs.find(d => d.id === id);
    if (doc) {
      doc.isActive = !doc.isActive;
      this.saveDocuments(docs);
      return doc.isActive;
    }
    return false;
  }

  public static addUrl(urlItem: Omit<KnowledgeUrl, 'id' | 'addedAt'>): KnowledgeUrl {
    const urls = this.getUrls();
    const newUrl: KnowledgeUrl = {
      ...urlItem,
      id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      addedAt: new Date(),
      isActive: urlItem.isActive !== undefined ? urlItem.isActive : true
    };
    urls.unshift(newUrl);
    this.saveUrls(urls);
    return newUrl;
  }

  public static deleteUrl(id: string): boolean {
    const urls = this.getUrls();
    const filtered = urls.filter(u => u.id !== id);
    if (filtered.length !== urls.length) {
      this.saveUrls(filtered);
      return true;
    }
    return false;
  }

  public static toggleUrlActive(id: string): boolean {
    const urls = this.getUrls();
    const item = urls.find(u => u.id === id);
    if (item) {
      item.isActive = !item.isActive;
      this.saveUrls(urls);
      return item.isActive;
    }
    return false;
  }

  /**
   * Search knowledge base documents and URLs for keywords/phrases matching user query
   */
  public static search(query: string, maxResults: number = 3): RetrievedSource[] {
    if (!query || query.trim().length < 2) return [];

    const normalizedQuery = query.toLowerCase();
    const tokens = normalizedQuery
      .split(/\W+/)
      .filter(t => t.length > 2 && !['what', 'when', 'where', 'which', 'who', 'how', 'the', 'and', 'with', 'about', 'this', 'that', 'from', 'your'].includes(t));

    const results: RetrievedSource[] = [];

    // Search active documents
    const activeDocs = this.getDocuments().filter(d => d.isActive);
    for (const doc of activeDocs) {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      const tagsLower = doc.tags.map(t => t.toLowerCase());

      // Title & tag matches
      for (const token of tokens) {
        if (titleLower.includes(token)) score += 5;
        if (tagsLower.some(tag => tag.includes(token))) score += 4;
      }

      // Paragraph chunk matching
      const paragraphs = doc.content.split(/\n\s*\n/).filter(p => p.trim().length > 20);
      let bestSnippet = '';
      let highestParaScore = 0;

      for (const para of paragraphs) {
        const paraLower = para.toLowerCase();
        let paraScore = 0;
        for (const token of tokens) {
          if (paraLower.includes(token)) paraScore += 2;
        }
        if (paraScore > highestParaScore) {
          highestParaScore = paraScore;
          bestSnippet = para.trim().substring(0, 350) + (para.length > 350 ? '...' : '');
        }
      }

      score += highestParaScore;

      if (score > 2) {
        results.push({
          title: doc.title,
          source: `Document: ${doc.title}`,
          snippet: bestSnippet || doc.content.substring(0, 250) + '...',
          type: 'doc',
          score
        });
      }
    }

    // Search active URLs
    const activeUrls = this.getUrls().filter(u => u.isActive);
    for (const u of activeUrls) {
      let score = 0;
      const titleLower = (u.title || '').toLowerCase();
      const summaryLower = (u.summary || '').toLowerCase();
      const contentLower = (u.content || '').toLowerCase();
      const urlLower = u.url.toLowerCase();

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 4;
        if (urlLower.includes(token)) score += 3;
        if (summaryLower.includes(token)) score += 2;
        if (contentLower.includes(token)) score += 2;
      }

      if (score > 1) {
        results.push({
          title: u.title || u.url,
          source: u.url,
          snippet: u.summary || u.content?.substring(0, 250) || u.url,
          type: 'url',
          score
        });
      }
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return results.slice(0, maxResults);
  }

  /**
   * Format grounding instruction block to pass to Gemini
   */
  public static buildGroundingContext(query: string, sources: RetrievedSource[]): string {
    if (!sources || sources.length === 0) return '';

    let prompt = `=== RETRIEVED KNOWLEDGE BASE CONTEXT FOR QUERY: "${query}" ===\n`;
    prompt += `The following verified documents or URLs from the system knowledge base contain relevant information for the user's inquiry:\n\n`;

    sources.forEach((src, idx) => {
      prompt += `[SOURCE ${idx + 1} - ${src.type === 'doc' ? 'DOCUMENT' : 'URL'}: "${src.title}"]\n`;
      prompt += `Reference: ${src.source}\n`;
      prompt += `Excerpt/Content:\n${src.snippet}\n\n`;
    });

    prompt += `=== GROUNDING INSTRUCTIONS ===\n`;
    prompt += `1. Prioritize facts, numbers, return windows, rules, ratios, and steps from the above retrieved sources when answering.\n`;
    prompt += `2. Cite the source naturally in your explanation (e.g., "[Doc: OmniCorp Customer Guarantee]" or "[Source: MDN Web Docs]").\n`;
    prompt += `3. If the user asks a direct question answered in the knowledge base, answer it accurately and comprehensively.\n`;

    return prompt;
  }
}
