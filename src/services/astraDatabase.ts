// =============================================================================
// ASTRA ROOM DATABASE SIMULATOR (In-Memory + LocalStorage Persistence)
// Implements the 9 Android Room Entities and DAOs from com.astra.agent
// =============================================================================

export interface Conversation {
  id: string;
  title: string;
  projectId: string | null;
  pinned: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  parentId: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: string | null; // JSON or base64
  isStreaming?: boolean;
  citations?: string | null; // JSON string of Citation[]
}

export interface Citation {
  title: string;
  url: string;
  snippet: string;
}

export interface FileEntity {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  size: number;
  projectId: string | null;
  createdAt: number;
}

export interface MemoryEntity {
  id: string;
  key: string;
  value: string;
  importance: number; // 1 to 5
  expiresAt: number | null;
  createdAt: number;
}

export interface TaskEntity {
  id: string;
  goal: string;
  state: string; // IDLE | THINKING | PLANNING | SEARCHING | READING | USING_TOOL | WAITING_APPROVAL | EXECUTING | VERIFYING | COMPLETED | FAILED | CANCELLED
  stepsJson: string; // JSON of AgentStep[]
  result: string | null;
  createdAt: number;
}

export interface ToolCallEntity {
  id: string;
  taskId: string;
  toolName: string;
  inputJson: string;
  outputJson: string | null;
  permissionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  approvalStatus: 'PENDING' | 'APPROVED' | 'DENIED' | 'AUTO_GRANTED';
  timestamp: number;
}

export interface AuditLogEntity {
  id: string;
  timestamp: number;
  tool: string;
  action: string;
  permission: string;
  approval: string;
  result: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;
  createdAt: number;
}

export interface Automation {
  id: string;
  name: string;
  triggerType: 'schedule' | 'event' | 'intent' | 'location';
  triggerConfig: string;
  actionConfig: string;
  enabled: boolean;
}

const STORAGE_PREFIX = 'astra_room_db_';

class AstraDatabase {
  private conversations: Conversation[] = [];
  private messages: Message[] = [];
  private files: FileEntity[] = [];
  private memories: MemoryEntity[] = [];
  private tasks: TaskEntity[] = [];
  private toolCalls: ToolCallEntity[] = [];
  private auditLogs: AuditLogEntity[] = [];
  private projects: Project[] = [];
  private automations: Automation[] = [];

  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    if (this.conversations.length === 0) {
      this.seedInitialData();
    }
  }

  private loadFromStorage() {
    try {
      const get = (key: string) => {
        const val = localStorage.getItem(STORAGE_PREFIX + key);
        return val ? JSON.parse(val) : null;
      };

      this.conversations = get('conversations') || [];
      this.messages = get('messages') || [];
      this.files = get('files') || [];
      this.memories = get('memories') || [];
      this.tasks = get('tasks') || [];
      this.toolCalls = get('tool_calls') || [];
      this.auditLogs = get('audit_logs') || [];
      this.projects = get('projects') || [];
      this.automations = get('automations') || [];
    } catch {
      // ignore storage parsing error
    }
  }

  private saveToStorage() {
    try {
      const set = (key: string, data: any) => {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
      };
      set('conversations', this.conversations);
      set('messages', this.messages);
      set('files', this.files);
      set('memories', this.memories);
      set('tasks', this.tasks);
      set('tool_calls', this.toolCalls);
      set('audit_logs', this.auditLogs);
      set('projects', this.projects);
      set('automations', this.automations);
    } catch {
      // ignore quota exceeded error
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private seedInitialData() {
    const defaultProjectId = 'proj-core-agent';
    this.projects = [
      {
        id: defaultProjectId,
        name: 'Astra Super-Agent Core',
        description: 'Autonomous multi-modal assistance, Android accessibility, and high-precision reasoning',
        instructions: 'Always cross-reference citations, enforce strict sandboxing, verify code, and respect Android permissions.',
        createdAt: Date.now() - 86400000 * 3,
      },
    ];

    const defaultConvId = 'conv-welcome';
    this.conversations = [
      {
        id: defaultConvId,
        title: 'Welcome to Astra Agent',
        projectId: defaultProjectId,
        pinned: true,
        archived: false,
        createdAt: Date.now() - 3600000 * 2,
        updatedAt: Date.now() - 3600000,
      },
    ];

    this.messages = [
      {
        id: 'msg-1',
        conversationId: defaultConvId,
        parentId: null,
        role: 'assistant',
        content: 'Hello! I am Astra AI Agent, running with complete Android Room database persistence, multi-model routing, 6-stage deep research, and safety-gated tool execution.',
        timestamp: Date.now() - 3600000 * 2,
      },
    ];

    this.memories = [
      {
        id: 'mem-1',
        key: 'User Preferred Mode',
        value: 'Deep Technical & Architectural breakdown with verified citations',
        importance: 5,
        expiresAt: null,
        createdAt: Date.now() - 86400000,
      },
      {
        id: 'mem-2',
        key: 'Android Safety Rule',
        value: 'Strict sandbox isolation; high-impact filesystem or intent calls require explicit user authorization',
        importance: 5,
        expiresAt: null,
        createdAt: Date.now() - 86400000,
      },
    ];

    this.automations = [
      {
        id: 'auto-1',
        name: 'Morning Intelligence Briefing',
        triggerType: 'schedule',
        triggerConfig: '08:00 AM Daily',
        actionConfig: 'Execute ResearchEngine on top tech milestones and synthesize summary',
        enabled: true,
      },
      {
        id: 'auto-2',
        name: 'Android Permission Guard Dog',
        triggerType: 'intent',
        triggerConfig: 'android.intent.action.PACKAGE_CHANGED',
        actionConfig: 'Audit permission levels and log event to audit_logs Room table',
        enabled: true,
      },
    ];

    this.auditLogs = [
      {
        id: 'audit-0',
        timestamp: Date.now() - 3600000 * 2,
        tool: 'AstraApplication',
        action: 'Room Database initialized (9 tables: conversations, messages, files, memories, tasks, tool_calls, audit_logs, projects, automations)',
        permission: 'INTERNAL',
        approval: 'AUTO_GRANTED',
        result: 'SUCCESS',
      },
    ];

    this.saveToStorage();
  }

  // DAOs: Conversations
  public getAllConversations(): Conversation[] {
    return [...this.conversations].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  public getConversation(id: string): Conversation | undefined {
    return this.conversations.find((c) => c.id === id);
  }

  public insertConversation(conversation: Conversation) {
    this.conversations.unshift(conversation);
    this.saveToStorage();
  }

  public updateConversation(conversation: Conversation) {
    this.conversations = this.conversations.map((c) => (c.id === conversation.id ? conversation : c));
    this.saveToStorage();
  }

  public deleteConversation(id: string) {
    this.conversations = this.conversations.filter((c) => c.id !== id);
    this.messages = this.messages.filter((m) => m.conversationId !== id);
    this.saveToStorage();
  }

  // DAOs: Messages
  public getMessagesForConversation(conversationId: string): Message[] {
    return this.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  public insertMessage(message: Message) {
    this.messages.push(message);
    const conv = this.conversations.find((c) => c.id === message.conversationId);
    if (conv) {
      conv.updatedAt = message.timestamp;
      if (conv.title === 'New Chat' && message.role === 'user') {
        conv.title = message.content.slice(0, 32);
      }
    }
    this.saveToStorage();
  }

  public updateMessage(message: Message) {
    this.messages = this.messages.map((m) => (m.id === message.id ? message : m));
    this.saveToStorage();
  }

  // DAOs: Memories
  public getAllMemories(): MemoryEntity[] {
    return [...this.memories].sort((a, b) => b.importance - a.importance || b.createdAt - a.createdAt);
  }

  public insertMemory(memory: MemoryEntity) {
    this.memories.unshift(memory);
    this.saveToStorage();
  }

  public deleteMemory(id: string) {
    this.memories = this.memories.filter((m) => m.id !== id);
    this.saveToStorage();
  }

  public searchMemories(query: string): MemoryEntity[] {
    const q = query.toLowerCase();
    return this.memories.filter(
      (m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
    );
  }

  // DAOs: Tasks
  public getAllTasks(): TaskEntity[] {
    return [...this.tasks].sort((a, b) => b.createdAt - a.createdAt);
  }

  public insertTask(task: TaskEntity) {
    this.tasks.unshift(task);
    this.saveToStorage();
  }

  public updateTask(task: TaskEntity) {
    this.tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
    this.saveToStorage();
  }

  // DAOs: Tool Calls
  public insertToolCall(toolCall: ToolCallEntity) {
    this.toolCalls.unshift(toolCall);
    this.saveToStorage();
  }

  public getToolCallsForTask(taskId: string): ToolCallEntity[] {
    return this.toolCalls.filter((tc) => tc.taskId === taskId);
  }

  public getAllToolCalls(): ToolCallEntity[] {
    return [...this.toolCalls];
  }

  // DAOs: Audit Logs
  public insertAuditLog(log: AuditLogEntity) {
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) this.auditLogs.pop();
    this.saveToStorage();
  }

  public getAllAuditLogs(): AuditLogEntity[] {
    return [...this.auditLogs];
  }

  // DAOs: Projects
  public getAllProjects(): Project[] {
    return [...this.projects].sort((a, b) => b.createdAt - a.createdAt);
  }

  public insertProject(project: Project) {
    this.projects.unshift(project);
    this.saveToStorage();
  }

  // DAOs: Automations
  public getAllAutomations(): Automation[] {
    return [...this.automations];
  }

  public insertAutomation(automation: Automation) {
    this.automations.unshift(automation);
    this.saveToStorage();
  }

  public toggleAutomation(id: string) {
    this.automations = this.automations.map((a) =>
      a.id === id ? { ...a, enabled: !a.enabled } : a
    );
    this.saveToStorage();
  }

  // Files
  public getAllFiles(): FileEntity[] {
    return [...this.files];
  }

  public insertFile(file: FileEntity) {
    this.files.unshift(file);
    this.saveToStorage();
  }
}

export const astraDb = new AstraDatabase();
