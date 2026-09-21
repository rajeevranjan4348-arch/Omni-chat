import { MemoryItem, MemoryCategory } from '../types';
import { getAiInstance } from './gemini';

/**
 * Fast client-side extractor for immediate real-time memory capture
 * Accurately extracts user name, stated interests, preferences, and goals
 */
export const extractLocalMemories = (text: string): MemoryItem[] => {
  const items: MemoryItem[] = [];
  const trimmed = text.trim();

  // 1. Name detection
  const namePatterns = [
    /(?:my name is|i am|i'm|call me)\s+([A-Z][a-zA-Z]+)(?:\s+([A-Z][a-zA-Z]+))?/i,
    /(?:this is)\s+([A-Z][a-zA-Z]+)\s+here/i
  ];

  for (const pattern of namePatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const extractedName = (match[1] + (match[2] ? ` ${match[2]}` : '')).trim();
      // Ensure it's not a common stop word like "I am happy" or "I am trying"
      const lower = extractedName.toLowerCase();
      if (!['trying', 'looking', 'going', 'asking', 'wondering', 'happy', 'new', 'here', 'just', 'building', 'working'].includes(lower)) {
        items.push({
          id: `mem_name_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          category: 'fact',
          content: `User's name is ${extractedName}`,
          timestamp: new Date(),
          source: 'auto'
        });
        break;
      }
    }
  }

  // 2. Stated Interests & Passions
  const interestPatterns = [
    /(?:i am interested in|i'm interested in|my interest is|my interests are)\s+([^.,;\n]+)/i,
    /(?:i love|i really enjoy|i enjoy|i am passionate about|i'm passionate about)\s+([^.,;\n]+)/i,
    /(?:my hobby is|my hobbies are)\s+([^.,;\n]+)/i,
    /(?:i'm into|i am into)\s+([^.,;\n]+)/i,
  ];

  for (const pattern of interestPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      const interest = match[1].trim();
      items.push({
        id: `mem_interest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'preference',
        content: `User stated interest: ${interest}`,
        timestamp: new Date(),
        source: 'auto'
      });
      break;
    }
  }

  // 3. Technical Role, Profession or Tools
  const rolePatterns = [
    /(?:i work as a|i work as an|i am a|i'm a)\s+([a-zA-Z\s]+(?:developer|engineer|designer|researcher|scientist|student|teacher|writer|architect|specialist|manager|founder))/i,
    /(?:my tech stack is|i use|i code in|i build with)\s+([^.,;\n]+)/i
  ];

  for (const pattern of rolePatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      items.push({
        id: `mem_role_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'fact',
        content: `User role/stack: ${match[1].trim()}`,
        timestamp: new Date(),
        source: 'auto'
      });
      break;
    }
  }

  // 4. Goals and Constraints
  const goalPatterns = [
    /(?:my goal is to|my goal is|i want to|i am aiming to|i'm aiming to)\s+([^.,;\n]+)/i,
    /(?:i need to finish|i am working on|i'm working on|my project is)\s+([^.,;\n]+)/i,
    /(?:the deadline is|my budget is)\s+([^.,;\n]+)/i
  ];

  for (const pattern of goalPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      items.push({
        id: `mem_goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        category: 'goal',
        content: `User goal/project: ${match[1].trim()}`,
        timestamp: new Date(),
        source: 'auto'
      });
      break;
    }
  }

  return items;
};

/**
 * AI-powered deep memory extractor using Gemini to analyze the conversation exchange
 * and identify key topics, preferences, constraints, or facts.
 */
export const extractMemoriesWithGemini = async (
  userText: string,
  existingMemories: MemoryItem[]
): Promise<MemoryItem[]> => {
  // Only invoke deep extraction if the message has substantial semantic content
  if (!userText || userText.trim().length < 8) {
    return [];
  }

  try {
    const ai = getAiInstance();
    const existingList = existingMemories.map(m => `[${m.category}] ${m.content}`).join('\n');

    const prompt = `Analyze this user message from a conversation and identify ANY NEW key details worth remembering for future conversation context.
Look specifically for:
1. User Identity & Background (name, title, profession, company, location)
2. Stated Interests & Passions (hobbies, fields of study, sports, arts, topics they enjoy)
3. User Preferences (coding style, language, favorite tools, tone preference, habits)
4. Active Goals & Constraints (deadlines, requirements, projects they are working on, budgets)

User message:
"${userText}"

Existing known memories:
${existingList || '(None yet)'}

If there are NO new memorable details or if it's just generic greetings/chitchat, reply with an empty JSON array: []
If there are new details, reply ONLY with a valid JSON array of objects with:
- "category": one of "preference", "topic", "goal", "fact"
- "content": a concise summary of the key detail (under 12 words)

Example outputs:
[{"category": "fact", "content": "User's name is Maya"}, {"category": "preference", "content": "Interested in astrophotography and coffee"}]

Respond ONLY with the JSON array, with no markdown formatting or commentary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text?.trim() || '[]';
    const parsed = JSON.parse(responseText);

    if (Array.isArray(parsed)) {
      const validCategories: MemoryCategory[] = ['preference', 'topic', 'goal', 'fact'];
      const newItems: MemoryItem[] = [];

      for (const item of parsed) {
        if (item && item.content && validCategories.includes(item.category)) {
          // Check for duplication with existing memories
          const isDuplicate = existingMemories.some(
            existing => existing.content.toLowerCase().includes(item.content.toLowerCase()) ||
                        item.content.toLowerCase().includes(existing.content.toLowerCase())
          );
          if (!isDuplicate) {
            newItems.push({
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              category: item.category as MemoryCategory,
              content: item.content.trim(),
              timestamp: new Date(),
              source: 'auto'
            });
          }
        }
      }

      return newItems;
    }
  } catch (error) {
    console.warn('AI memory extraction warning (falling back to local):', error);
  }

  // Fallback to local heuristic extractor
  return extractLocalMemories(userText);
};

/**
 * Identify which memories are most relevant to the current user query,
 * so we can surface them as recalled facts on the message.
 */
export const recallRelevantMemories = (query: string, memories: MemoryItem[]): string[] => {
  if (!query || memories.length === 0) return [];

  const lowerQuery = query.toLowerCase();
  const tokens = lowerQuery.split(/\W+/).filter(t => t.length > 2);

  // If user specifically asks what the bot remembers or about themselves
  if (lowerQuery.includes('remember') || lowerQuery.includes('what do you know about me') || lowerQuery.includes('who am i') || lowerQuery.includes('my name') || lowerQuery.includes('my interest')) {
    return memories.map(m => m.content);
  }

  // Scored recall
  const scored = memories.map(m => {
    let score = 0;
    const contentLower = m.content.toLowerCase();
    
    // Check tokens
    for (const token of tokens) {
      if (contentLower.includes(token)) score += 3;
    }

    // Name is always relevant if mentioned or implied
    if (m.content.toLowerCase().includes('name is') || m.category === 'fact') {
      score += 1;
    }

    return { memory: m.content, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.memory);
};
