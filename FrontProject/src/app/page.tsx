"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Textarea } from "@person-workspace/ui";

type MessageRole = "user" | "assistant" | "system";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
};

type CodexSession = {
  id: string;
  threadId: string;
  currentTurnId?: string | null;
  createdAt: string;
  updatedAt?: string;
  eventCount?: number;
  clientCount?: number;
  running?: boolean;
};

type ThreadSummary = {
  id: string;
  name?: string | null;
  preview?: string;
  cwd?: string;
  status?: string;
  source?: string;
  updatedAt?: number | null;
  createdAt?: number | null;
  liveSessionId?: string | null;
};

type ThreadItem = {
  id?: string;
  type?: string;
  content?: unknown;
  text?: string;
  command?: string;
  aggregatedOutput?: string | null;
};

type CodexTurn = {
  id: string;
  status?: string;
  items?: ThreadItem[];
};

type CodexThread = {
  id: string;
  name?: string | null;
  preview?: string;
  turns?: CodexTurn[];
};

type SessionsResponse = {
  sessions?: CodexSession[];
  threads?: ThreadSummary[];
};

type ReasoningEffortOption = {
  reasoningEffort: string;
  description?: string;
};

type ServiceTierOption = {
  id: string;
  name?: string;
  description?: string;
};

type CodexModelOption = {
  id: string;
  model: string;
  displayName: string;
  description?: string;
  supportedReasoningEfforts?: ReasoningEffortOption[];
  defaultReasoningEffort?: string | null;
  serviceTiers?: ServiceTierOption[];
  defaultServiceTier?: string | null;
  isDefault?: boolean;
};

type CodexSelection = {
  model: string;
  modelProvider: string | null;
  effort: string;
  serviceTier: string;
};

type CodexOptionsResponse = {
  defaults?: {
    model?: string;
    modelProvider?: string | null;
    effort?: string | null;
    serviceTier?: string | null;
  };
  models?: CodexModelOption[];
};

type SessionDetailResponse = {
  session?: CodexSession | null;
  thread?: CodexThread | null;
  turns?: CodexTurn[];
};

type ResumeResponse = SessionDetailResponse & {
  reused?: boolean;
};

type BridgeEvent = {
  type?: string;
  sessionId?: string;
  emittedAt?: string;
  replay?: boolean;
  text?: string;
  approvalId?: string;
  method?: string;
  params?: unknown;
  message?: {
    method?: string;
    params?: unknown;
  };
};

type ConnectionState = "idle" | "connecting" | "connected" | "closed";
type ModelPickerView = "main" | "models" | "speeds";
type ApprovalMode = "request" | "auto" | "full" | "custom";
type SlashCommandId =
  | "clear"
  | "compact"
  | "goal"
  | "clear-goal"
  | "status"
  | "interrupt"
  | "model"
  | "approval"
  | "new"
  | "history";

type ApprovalOption = {
  mode: ApprovalMode;
  title: string;
  description: string;
};

type SlashCommand = {
  id: SlashCommandId;
  command: string;
  title: string;
  description: string;
  requiresArgument?: boolean;
};

const bridgeUrl = process.env.NEXT_PUBLIC_CODEX_BRIDGE_URL ?? "http://127.0.0.1:3100";
const bridgeWsUrl = toWebSocketUrl(bridgeUrl);
const storedSessionIdKey = "personWorkspaceCodexSessionId";
const defaultApprovalMode: ApprovalMode = "auto";
const defaultCodexSelection: CodexSelection = {
  model: "",
  modelProvider: null,
  effort: "medium",
  serviceTier: "default"
};
const approvalOptions: ApprovalOption[] = [
  {
    mode: "request",
    title: "请求批准",
    description: "编辑外部文件和使用互联网前先询问"
  },
  {
    mode: "auto",
    title: "替我批准",
    description: "仅在检测到可能不安全的操作时询问"
  },
  {
    mode: "full",
    title: "完全访问",
    description: "完全访问计算机，风险较高"
  },
  {
    mode: "custom",
    title: "自定义 (config.toml)",
    description: "使用本机 config.toml 中定义的权限"
  }
];
const slashCommands: SlashCommand[] = [
  {
    id: "status",
    command: "/status",
    title: "状态",
    description: "查看当前会话、线程和事件连接状态"
  },
  {
    id: "model",
    command: "/model",
    title: "模型",
    description: "打开模型、强度和速度选择"
  },
  {
    id: "approval",
    command: "/approval",
    title: "批准方式",
    description: "打开 Codex 操作批准方式选择"
  },
  {
    id: "goal",
    command: "/goal",
    title: "目标",
    description: "为 Codex 设置持续处理的目标",
    requiresArgument: true
  },
  {
    id: "clear",
    command: "/clear",
    title: "清理当前会话",
    description: "断开当前页面会话并清空对话显示"
  },
  {
    id: "compact",
    command: "/compact",
    title: "压缩上下文",
    description: "调用 thread/compact/start 触发历史压缩"
  },
  {
    id: "clear-goal",
    command: "/clear-goal",
    title: "清除目标",
    description: "清除当前线程里的持续目标"
  },
  {
    id: "interrupt",
    command: "/interrupt",
    title: "中断",
    description: "中断当前正在执行的 Codex 任务"
  },
  {
    id: "new",
    command: "/new",
    title: "新建会话",
    description: "创建一个新的 Codex 会话"
  },
  {
    id: "history",
    command: "/history",
    title: "历史会话",
    description: "打开历史会话选择"
  }
];
const fallbackEffortOptions: ReasoningEffortOption[] = [
  {
    reasoningEffort: "low",
    description: "Fast responses with lighter reasoning"
  },
  {
    reasoningEffort: "medium",
    description: "Balances speed and reasoning depth for everyday tasks"
  },
  {
    reasoningEffort: "high",
    description: "Greater reasoning depth for complex problems"
  },
  {
    reasoningEffort: "xhigh",
    description: "Extra high reasoning depth for complex problems"
  }
];
const standardSpeedOption: ServiceTierOption = {
  id: "default",
  name: "标准",
  description: "使用本地 Codex 默认速度"
};
const effortLabels: Record<string, string> = {
  low: "低",
  medium: "中等",
  high: "高度",
  xhigh: "超高"
};
const speedLabels: Record<string, string> = {
  default: "标准",
  priority: "快速",
  fast: "快速"
};

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toWebSocketUrl(url: string) {
  const parsedUrl = new URL(url);
  parsedUrl.protocol = parsedUrl.protocol === "https:" ? "wss:" : "ws:";
  return parsedUrl.origin;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNestedId(value: unknown, key: string) {
  if (!isObject(value) || !isObject(value[key])) {
    return "";
  }

  const id = value[key].id;
  return typeof id === "string" ? id : "";
}

function readAgentDelta(event: BridgeEvent) {
  const params = event.message?.params;
  if (!isObject(params)) {
    return "";
  }

  return typeof params.delta === "string" ? params.delta : "";
}

function formatApproval(event: BridgeEvent) {
  if (!event.approvalId) {
    return "Codex 请求审批。";
  }

  const params = isObject(event.params) ? event.params : event.message?.params;
  const command = isObject(params) && typeof params.command === "string" ? params.command : "";
  const reason = isObject(params) && typeof params.reason === "string" ? params.reason : "";

  if (command) {
    return `Codex 请求审批：${command}`;
  }

  if (reason) {
    return `Codex 请求审批：${reason}`;
  }

  return `Codex 请求审批：${event.approvalId}`;
}

function normalizeSession(value: unknown): CodexSession | null {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.threadId !== "string") {
    return null;
  }

  return value as CodexSession;
}

function normalizeThread(value: unknown): CodexThread | null {
  if (!isObject(value) || typeof value.id !== "string") {
    return null;
  }

  return value as CodexThread;
}

function formatConversationTitle(title: string) {
  const normalizedTitle = title.trim();
  return normalizedTitle.length > 80 ? `${normalizedTitle.slice(0, 80)}...` : normalizedTitle;
}

function getThreadTitle(thread: ThreadSummary | CodexThread) {
  const title = thread.name?.trim() || thread.preview?.trim() || readFirstUserMessageFromThread(thread) || thread.id;
  return formatConversationTitle(title);
}

function getRestoredConversationTitle(thread: CodexThread | null, fallbackTitle = "") {
  const threadTitle = thread ? getThreadTitle(thread) : "";
  if (thread && threadTitle === thread.id && fallbackTitle) {
    return fallbackTitle;
  }

  return threadTitle || fallbackTitle;
}

function readFirstUserMessageFromThread(thread: ThreadSummary | CodexThread) {
  if (!("turns" in thread) || !Array.isArray(thread.turns)) {
    return "";
  }

  for (const turn of thread.turns) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    for (const item of items) {
      if (item.type !== "userMessage") {
        continue;
      }

      const content = readUserInputText(item.content);
      if (content) {
        return content.trim();
      }
    }
  }

  return "";
}

function formatThreadTime(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "未知时间";
  }

  return new Date(value * 1000).toLocaleString("zh-CN", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatEffortLabel(effort: string) {
  return effortLabels[effort] ?? effort;
}

function formatSpeedLabel(speedId: string, fallbackName = "") {
  return speedLabels[speedId] ?? (fallbackName || speedId);
}

function formatModelDisplayName(model: CodexModelOption | null | undefined, fallbackModel: string) {
  return model?.displayName || fallbackModel || "未返回模型";
}

function formatModelCompactName(model: string) {
  const normalizedModel = model.replace(/^gpt-/i, "");
  return normalizedModel || "模型";
}

function readSlashQuery(value: string) {
  if (!value.startsWith("/") || value.includes("\n")) {
    return null;
  }

  const query = value.slice(1);
  if (query.includes(" ")) {
    return null;
  }

  return query.toLowerCase();
}

function readSlashCommandInput(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue.startsWith("/")) {
    return null;
  }

  const match = /^\/([a-z-]+)(?:\s+([\s\S]*))?$/.exec(trimmedValue);
  if (!match) {
    return null;
  }

  return {
    name: match[1].toLowerCase(),
    argument: match[2]?.trim() ?? ""
  };
}

function filterSlashCommands(query: string) {
  return slashCommands.filter((command) => {
    const normalizedCommand = command.command.slice(1).toLowerCase();
    return (
      normalizedCommand.startsWith(query) ||
      command.title.toLowerCase().includes(query) ||
      command.description.toLowerCase().includes(query)
    );
  });
}

function getEffortOptionsForModel(model: CodexModelOption | null | undefined) {
  const modelEfforts = model?.supportedReasoningEfforts?.filter((option) => option.reasoningEffort) ?? [];
  return modelEfforts.length > 0 ? modelEfforts : fallbackEffortOptions;
}

function getSpeedOptionsForModel(model: CodexModelOption | null | undefined) {
  const tiers = model?.serviceTiers?.filter((tier) => tier.id) ?? [];
  const hasStandard = tiers.some((tier) => tier.id === standardSpeedOption.id);
  return hasStandard ? tiers : [standardSpeedOption, ...tiers];
}

function findSelectedModel(models: CodexModelOption[], modelName: string) {
  return models.find((model) => model.model === modelName || model.id === modelName) ?? null;
}

function readUserInputText(content: unknown) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (!isObject(item) || typeof item.type !== "string") {
        return "";
      }

      if (item.type === "text" && typeof item.text === "string") {
        return item.text;
      }

      if (item.type === "image" && typeof item.url === "string") {
        return `[图片] ${item.url}`;
      }

      if (item.type === "localImage" && typeof item.path === "string") {
        return `[本地图片] ${item.path}`;
      }

      if ((item.type === "skill" || item.type === "mention") && typeof item.name === "string") {
        return `@${item.name}`;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function messagesFromThread(thread: CodexThread | null): Message[] {
  const turns = Array.isArray(thread?.turns) ? thread.turns : [];
  const messages: Message[] = [];

  for (const turn of turns) {
    const items = Array.isArray(turn.items) ? turn.items : [];
    for (const item of items) {
      if (item.type === "userMessage") {
        const content = readUserInputText(item.content);
        if (content) {
          messages.push({
            id: item.id ?? createId("history-user"),
            role: "user",
            content
          });
        }
      }

      if (item.type === "agentMessage" && item.text) {
        messages.push({
          id: item.id ?? createId("history-agent"),
          role: "assistant",
          content: item.text
        });
      }
    }
  }

  if (messages.length > 0) {
    return messages;
  }

  return [
    {
      id: createId("system"),
      role: "system",
      content: thread ? "已恢复会话，历史 turns 暂无可展示文本。" : "请选择历史会话或创建新会话。"
    }
  ];
}

function findInProgressTurn(thread: CodexThread | null) {
  return thread?.turns?.find((turn) => turn.status === "inProgress") ?? null;
}

export default function HomePage() {
  const [session, setSession] = useState<CodexSession | null>(null);
  const [memorySessions, setMemorySessions] = useState<CodexSession[]>([]);
  const [historyThreads, setHistoryThreads] = useState<ThreadSummary[]>([]);
  const [codexModels, setCodexModels] = useState<CodexModelOption[]>([]);
  const [codexSelection, setCodexSelection] = useState<CodexSelection>(defaultCodexSelection);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(defaultApprovalMode);
  const [isLoadingCodexOptions, setIsLoadingCodexOptions] = useState(false);
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isApprovalPickerOpen, setIsApprovalPickerOpen] = useState(false);
  const [modelPickerView, setModelPickerView] = useState<ModelPickerView>("main");
  const [currentConversationTitle, setCurrentConversationTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "页面打开后会自动恢复上次会话；没有上次会话时，可以创建一个新会话。"
    }
  ]);
  const [draft, setDraft] = useState("");
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [statusText, setStatusText] = useState("正在读取历史会话");
  const [eventCount, setEventCount] = useState(0);
  const [error, setError] = useState("");
  const [slashActiveIndex, setSlashActiveIndex] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const modelPickerRef = useRef<HTMLDivElement | null>(null);
  const approvalPickerRef = useRef<HTMLDivElement | null>(null);
  const activeTurnIdRef = useRef<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const didBootstrapRef = useRef(false);
  const activeThreadId = session?.threadId ?? "";
  const selectedModel = findSelectedModel(codexModels, codexSelection.model);
  const effortOptions = getEffortOptionsForModel(selectedModel);
  const speedOptions = getSpeedOptionsForModel(selectedModel);
  const selectedSpeed =
    speedOptions.find((speed) => speed.id === codexSelection.serviceTier) ?? standardSpeedOption;
  const selectedApprovalOption = approvalOptions.find((option) => option.mode === approvalMode) ?? approvalOptions[1];
  const modelTriggerText = `${formatModelCompactName(codexSelection.model)} ${formatEffortLabel(codexSelection.effort)}`;
  const slashQuery = readSlashQuery(draft);
  const visibleSlashCommands = slashQuery === null ? [] : filterSlashCommands(slashQuery);
  const isSlashPanelOpen = slashQuery !== null && visibleSlashCommands.length > 0;
  const activeSlashIndex = Math.min(slashActiveIndex, Math.max(visibleSlashCommands.length - 1, 0));
  const activeSlashCommand = visibleSlashCommands[activeSlashIndex] ?? null;

  useEffect(() => {
    if (didBootstrapRef.current) {
      return undefined;
    }

    didBootstrapRef.current = true;
    void bootstrapSession();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isModelPickerOpen) {
      return undefined;
    }

    function handleDocumentPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && modelPickerRef.current?.contains(target)) {
        return;
      }

      setIsModelPickerOpen(false);
      setModelPickerView("main");
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, [isModelPickerOpen]);

  useEffect(() => {
    if (!isApprovalPickerOpen) {
      return undefined;
    }

    function handleDocumentPointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && approvalPickerRef.current?.contains(target)) {
        return;
      }

      setIsApprovalPickerOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, [isApprovalPickerOpen]);

  useEffect(() => {
    setSlashActiveIndex(0);
  }, [slashQuery]);

  useEffect(() => {
    if (!activeThreadId) {
      return;
    }

    const activeHistoryThread = historyThreads.find((thread) => thread.id === activeThreadId);
    if (!activeHistoryThread) {
      return;
    }

    const historyTitle = getThreadTitle(activeHistoryThread);
    if (!historyTitle || historyTitle === activeThreadId) {
      return;
    }

    setCurrentConversationTitle((title) => {
      if (title && title !== activeThreadId) {
        return title;
      }

      return historyTitle;
    });
  }, [activeThreadId, historyThreads]);

  async function bootstrapSession() {
    await Promise.all([loadCodexOptions(), loadSessions()]);

    const storedSessionId = window.localStorage.getItem(storedSessionIdKey);
    if (!storedSessionId) {
      setStatusText("等待创建会话");
      return;
    }

    await resumeSession(storedSessionId, true);
  }

  async function loadCodexOptions() {
    setIsLoadingCodexOptions(true);

    try {
      const response = await fetch(`${bridgeUrl}/codex/options`);
      if (!response.ok) {
        throw new Error("读取 Codex 模型配置失败");
      }

      const data = (await response.json()) as CodexOptionsResponse;
      const models = Array.isArray(data.models) ? data.models : [];
      setCodexModels(models);
      setCodexSelection((currentSelection) => normalizeCodexSelection(data, models, currentSelection));
    } catch (optionsError) {
      setError(optionsError instanceof Error ? optionsError.message : "读取 Codex 模型配置失败");
    } finally {
      setIsLoadingCodexOptions(false);
    }
  }

  function normalizeCodexSelection(
    data: CodexOptionsResponse,
    models: CodexModelOption[],
    currentSelection: CodexSelection
  ): CodexSelection {
    const shouldUseDefaults = !currentSelection.model;
    const defaultModel = data.defaults?.model || models.find((model) => model.isDefault)?.model || models[0]?.model || "";
    const modelName = currentSelection.model || defaultModel;
    const modelOption = findSelectedModel(models, modelName);
    const availableEfforts = getEffortOptionsForModel(modelOption);
    const requestedDefaultEffort = data.defaults?.effort || modelOption?.defaultReasoningEffort || availableEfforts[0]?.reasoningEffort || "medium";
    const defaultEffort = availableEfforts.some((option) => option.reasoningEffort === requestedDefaultEffort)
      ? requestedDefaultEffort
      : availableEfforts[0]?.reasoningEffort || "medium";
    const effort = !shouldUseDefaults && availableEfforts.some((option) => option.reasoningEffort === currentSelection.effort)
      ? currentSelection.effort
      : defaultEffort;
    const availableSpeeds = getSpeedOptionsForModel(modelOption);
    const requestedDefaultSpeed = data.defaults?.serviceTier || modelOption?.defaultServiceTier || standardSpeedOption.id;
    const defaultSpeed = availableSpeeds.some((option) => option.id === requestedDefaultSpeed)
      ? requestedDefaultSpeed
      : standardSpeedOption.id;
    const serviceTier = !shouldUseDefaults && availableSpeeds.some((option) => option.id === currentSelection.serviceTier)
      ? currentSelection.serviceTier
      : defaultSpeed;

    return {
      model: modelOption?.model || modelName,
      modelProvider: data.defaults?.modelProvider ?? currentSelection.modelProvider,
      effort,
      serviceTier
    };
  }

  async function loadSessions() {
    setIsLoadingSessions(true);

    try {
      const response = await fetch(`${bridgeUrl}/sessions?limit=50`);
      if (!response.ok) {
        throw new Error("读取历史会话失败");
      }

      const data = (await response.json()) as SessionsResponse;
      setMemorySessions(Array.isArray(data.sessions) ? data.sessions : []);
      setHistoryThreads(Array.isArray(data.threads) ? data.threads : []);
    } catch (sessionsError) {
      setError(sessionsError instanceof Error ? sessionsError.message : "读取历史会话失败");
    } finally {
      setIsLoadingSessions(false);
    }
  }

  function buildCodexRequestSettings() {
    const settings: Record<string, unknown> = {};
    const config: Record<string, unknown> = {};
    if (codexSelection.model) {
      settings.model = codexSelection.model;
    }
    if (codexSelection.modelProvider) {
      settings.modelProvider = codexSelection.modelProvider;
    }
    if (codexSelection.serviceTier) {
      settings.serviceTier = codexSelection.serviceTier;
    }
    if (codexSelection.effort) {
      settings.effort = codexSelection.effort;
      config.model_reasoning_effort = codexSelection.effort;
    }

    Object.assign(settings, buildApprovalRequestSettings(approvalMode));

    if (Object.keys(config).length > 0) {
      settings.config = config;
    }

    return settings;
  }

  function buildApprovalRequestSettings(mode: ApprovalMode): Record<string, unknown> {
    if (mode === "custom") {
      return {};
    }

    if (mode === "full") {
      return {
        approvalPolicy: "never",
        approvalsReviewer: "user",
        sandbox: "danger-full-access",
        sandboxPolicy: {
          type: "dangerFullAccess"
        }
      };
    }

    return {
      approvalPolicy: "on-request",
      approvalsReviewer: mode === "auto" ? "auto_review" : "user",
      sandbox: "workspace-write"
    };
  }

  function selectModel(model: CodexModelOption) {
    setCodexSelection((currentSelection) => {
      const availableEfforts = getEffortOptionsForModel(model);
      const effort = availableEfforts.some((option) => option.reasoningEffort === currentSelection.effort)
        ? currentSelection.effort
        : model.defaultReasoningEffort || availableEfforts[0]?.reasoningEffort || currentSelection.effort;
      const availableSpeeds = getSpeedOptionsForModel(model);
      const serviceTier = availableSpeeds.some((option) => option.id === currentSelection.serviceTier)
        ? currentSelection.serviceTier
        : model.defaultServiceTier || standardSpeedOption.id;

      return {
        ...currentSelection,
        model: model.model,
        effort,
        serviceTier
      };
    });
    setModelPickerView("main");
  }

  function selectEffort(effort: string) {
    setCodexSelection((currentSelection) => ({
      ...currentSelection,
      effort
    }));
  }

  function selectSpeed(serviceTier: string) {
    setCodexSelection((currentSelection) => ({
      ...currentSelection,
      serviceTier
    }));
    setModelPickerView("main");
  }

  function appendSystemMessage(content: string) {
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createId("system"),
        role: "system",
        content
      }
    ]);
  }

  function clearCurrentSession() {
    socketRef.current?.close();
    socketRef.current = null;
    activeTurnIdRef.current = null;
    assistantMessageIdRef.current = null;
    window.localStorage.removeItem(storedSessionIdKey);
    setSession(null);
    setCurrentConversationTitle("");
    setEventCount(0);
    setIsStreaming(false);
    setConnectionState("idle");
    setStatusText("当前会话已清理");
    setDraft("");
    setError("");
    setMessages([
      {
        id: createId("system"),
        role: "system",
        content: "当前页面会话已清理；历史线程仍保留，可以从历史会话重新恢复。"
      }
    ]);
    void loadSessions();
  }

  function appendAssistantDelta(delta: string) {
    if (!delta) {
      return;
    }

    const messageId = assistantMessageIdRef.current ?? createId("assistant");
    assistantMessageIdRef.current = messageId;

    setMessages((currentMessages) => {
      const hasMessage = currentMessages.some((message) => message.id === messageId);
      if (!hasMessage) {
        return [
          ...currentMessages,
          {
            id: messageId,
            role: "assistant",
            content: delta
          }
        ];
      }

      return currentMessages.map((message) =>
        message.id === messageId ? { ...message, content: `${message.content}${delta}` } : message
      );
    });
  }

  function handleBridgeEvent(event: BridgeEvent) {
    setEventCount((currentCount) => currentCount + 1);

    if (event.type === "connected") {
      setStatusText("事件通道已连接");
      return;
    }

    if (event.type === "session_resumed") {
      setStatusText("会话已恢复");
      return;
    }

    if (event.type === "session_created") {
      setStatusText("会话已创建");
      return;
    }

    if (event.type === "approval_request") {
      setStatusText("等待用户审批");
      appendSystemMessage(formatApproval(event));
      return;
    }

    if (event.type === "codex_log" && event.text) {
      setStatusText(event.text.trim().slice(0, 80) || "收到 Codex 日志");
      return;
    }

    const method = event.message?.method;
    const params = event.message?.params;

    if (method === "turn/started") {
      activeTurnIdRef.current = readNestedId(params, "turn");
      setIsStreaming(true);
      setStatusText("Codex 正在处理");
      return;
    }

    if (method === "item/agentMessage/delta") {
      appendAssistantDelta(readAgentDelta(event));
      setStatusText("正在接收 Codex 输出");
      return;
    }

    if (method === "turn/completed") {
      activeTurnIdRef.current = null;
      assistantMessageIdRef.current = null;
      setIsStreaming(false);
      setStatusText("本轮已完成");
      void loadSessions();
      return;
    }

    if (method === "error") {
      setStatusText("Codex 返回错误事件");
      appendSystemMessage("Codex 返回错误事件，请检查 AppServer 日志。");
    }
  }

  function connectEvents(sessionId: string) {
    socketRef.current?.close();
    setConnectionState("connecting");

    const socket = new WebSocket(`${bridgeWsUrl}/sessions/${sessionId}/events`);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionState("connected");
      setStatusText("事件通道已打开");
    };

    socket.onclose = () => {
      if (socketRef.current === socket) {
        setConnectionState("closed");
      }
    };

    socket.onerror = () => {
      setError("事件通道连接失败，请确认 AppServer 正在运行。");
    };

    socket.onmessage = (event) => {
      try {
        handleBridgeEvent(JSON.parse(String(event.data)) as BridgeEvent);
      } catch {
        setStatusText("收到无法解析的事件");
      }
    };
  }

  function applyRestoredThread(thread: CodexThread | null, fallbackTitle = "") {
    const inProgressTurn = findInProgressTurn(thread);
    activeTurnIdRef.current = inProgressTurn?.id ?? null;
    assistantMessageIdRef.current = null;
    setIsStreaming(Boolean(inProgressTurn));
    setMessages(messagesFromThread(thread));
    setCurrentConversationTitle(getRestoredConversationTitle(thread, fallbackTitle));
  }

  async function createSession() {
    if (isCreatingSession) {
      return;
    }

    setIsCreatingSession(true);
    setError("");
    setStatusText("正在创建 Codex 会话");

    try {
      const response = await fetch(`${bridgeUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildCodexRequestSettings())
      });

      if (!response.ok) {
        throw new Error("创建会话失败，请确认 AppServer 已启动。");
      }

      const createdSession = normalizeSession(await response.json());
      if (!createdSession) {
        throw new Error("创建会话失败：AppServer 返回内容缺少 session id。");
      }

      window.localStorage.setItem(storedSessionIdKey, createdSession.id);
      setSession(createdSession);
      setCurrentConversationTitle("");
      setMessages([
        {
          id: createId("system"),
          role: "system",
          content: `会话已创建，threadId：${createdSession.threadId}`
        }
      ]);
      setStatusText("会话已创建");
      setEventCount(0);
      connectEvents(createdSession.id);
      void loadSessions();
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "创建会话失败");
      setStatusText("创建会话失败");
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function resumeSession(sessionId: string, silent = false, fallbackTitle = "") {
    if (isRestoringSession) {
      return false;
    }

    setIsRestoringSession(true);
    setError("");
    setStatusText(silent ? "正在恢复上次会话" : "正在恢复会话");

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${encodeURIComponent(sessionId)}/resume`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildCodexRequestSettings())
      });

      if (!response.ok) {
        throw new Error("恢复会话失败，请确认本地 Codex 历史仍存在。");
      }

      const data = (await response.json()) as ResumeResponse;
      const restoredSession = normalizeSession(data.session);
      if (!restoredSession) {
        throw new Error("恢复会话失败：AppServer 返回内容缺少 session id。");
      }

      const restoredThread = normalizeThread(data.thread);
      window.localStorage.setItem(storedSessionIdKey, restoredSession.id);
      setSession(restoredSession);
      setEventCount(0);
      applyRestoredThread(restoredThread, fallbackTitle);
      setStatusText(data.reused ? "已连接当前会话" : "会话已恢复");
      connectEvents(restoredSession.id);
      void loadSessions();
      return true;
    } catch (resumeError) {
      if (silent) {
        window.localStorage.removeItem(storedSessionIdKey);
      }
      setError(resumeError instanceof Error ? resumeError.message : "恢复会话失败");
      setStatusText("恢复会话失败");
      if (silent) {
        setMessages([
          {
            id: createId("system"),
            role: "system",
            content: "上次会话恢复失败，可以从左侧历史列表重新恢复，或创建新会话。"
          }
        ]);
      }
      return false;
    } finally {
      setIsRestoringSession(false);
    }
  }

  async function resumeHistoryThread(threadId: string) {
    const historyThread = historyThreads.find((thread) => thread.id === threadId);
    const restored = await resumeSession(threadId, false, historyThread ? getThreadTitle(historyThread) : "");
    if (restored) {
      setIsHistoryOpen(false);
    }
  }

  async function sendMessage() {
    const input = draft.trim();

    if (!input || isStreaming || !session) {
      if (!session) {
        setError("请先创建或恢复 Codex 会话。");
      }
      return;
    }

    const assistantMessageId = createId("assistant");
    assistantMessageIdRef.current = assistantMessageId;
    setDraft("");
    setError("");
    setIsStreaming(true);
    setStatusText("正在发送需求");
    setCurrentConversationTitle((title) => title || formatConversationTitle(input));
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createId("user"),
        role: "user",
        content: input
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: ""
      }
    ]);

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${session.id}/turns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          ...buildCodexRequestSettings()
        })
      });

      if (!response.ok) {
        throw new Error("发送需求失败，请确认 AppServer 会话仍然有效。");
      }

      const result = (await response.json()) as { turnId?: string };
      activeTurnIdRef.current = result.turnId ?? null;
      setStatusText("需求已发送");
    } catch (sendError) {
      assistantMessageIdRef.current = null;
      activeTurnIdRef.current = null;
      setIsStreaming(false);
      setError(sendError instanceof Error ? sendError.message : "发送需求失败");
      appendAssistantDelta("\n\n发送失败，请确认 AppServer 服务状态。");
    }
  }

  async function interruptTurn() {
    if (!session || !activeTurnIdRef.current) {
      return;
    }

    setError("");
    setStatusText("正在请求中断");

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${session.id}/interrupt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          turnId: activeTurnIdRef.current
        })
      });

      if (!response.ok) {
        throw new Error("中断请求失败");
      }

      setStatusText("已请求中断");
    } catch (interruptError) {
      setError(interruptError instanceof Error ? interruptError.message : "中断请求失败");
    }
  }

  async function compactCurrentThread() {
    if (!session) {
      setError("请先创建或恢复 Codex 会话。");
      return;
    }

    setError("");
    setStatusText("正在请求压缩上下文");

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${session.id}/compact`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("压缩上下文请求失败");
      }

      appendSystemMessage("已触发上下文压缩，进度会通过当前会话事件继续返回。");
      setStatusText("已请求压缩上下文");
    } catch (compactError) {
      setError(compactError instanceof Error ? compactError.message : "压缩上下文请求失败");
      setStatusText("压缩上下文失败");
    }
  }

  async function setCurrentGoal(objective: string) {
    if (!session) {
      setError("请先创建或恢复 Codex 会话。");
      return;
    }

    const normalizedObjective = objective.trim();
    if (!normalizedObjective) {
      setError("请在 /goal 后输入目标内容。");
      return;
    }

    setError("");
    setStatusText("正在设置目标");

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${session.id}/goal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "set",
          objective: normalizedObjective
        })
      });

      if (!response.ok) {
        throw new Error("设置目标失败");
      }

      appendSystemMessage(`已设置目标：${normalizedObjective}`);
      setStatusText("目标已设置");
    } catch (goalError) {
      setError(goalError instanceof Error ? goalError.message : "设置目标失败");
      setStatusText("设置目标失败");
    }
  }

  async function clearCurrentGoal() {
    if (!session) {
      setError("请先创建或恢复 Codex 会话。");
      return;
    }

    setError("");
    setStatusText("正在清除目标");

    try {
      const response = await fetch(`${bridgeUrl}/sessions/${session.id}/goal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action: "clear"
        })
      });

      if (!response.ok) {
        throw new Error("清除目标失败");
      }

      appendSystemMessage("已清除当前线程目标。");
      setStatusText("目标已清除");
    } catch (goalError) {
      setError(goalError instanceof Error ? goalError.message : "清除目标失败");
      setStatusText("清除目标失败");
    }
  }

  function appendCurrentStatus() {
    appendSystemMessage(
      [
        `状态：${statusText}`,
        `连接：${connectionState}`,
        `Session：${session?.id ?? "未创建"}`,
        `Thread：${session?.threadId ?? "未创建"}`,
        `事件：${eventCount}`,
        `模型：${modelTriggerText}`,
        `批准方式：${selectedApprovalOption.title}`
      ].join("\n")
    );
  }

  async function runSlashCommand(command: SlashCommand, argument = "") {
    setDraft("");
    setError("");

    if (command.requiresArgument && !argument.trim()) {
      setDraft(`${command.command} `);
      setStatusText(`请输入 ${command.command} 的内容`);
      return;
    }

    if (command.id === "clear") {
      clearCurrentSession();
      return;
    }

    if (command.id === "compact") {
      await compactCurrentThread();
      return;
    }

    if (command.id === "goal") {
      await setCurrentGoal(argument);
      return;
    }

    if (command.id === "clear-goal") {
      await clearCurrentGoal();
      return;
    }

    if (command.id === "status") {
      appendCurrentStatus();
      setStatusText("已输出当前状态");
      return;
    }

    if (command.id === "interrupt") {
      if (!isStreaming) {
        appendSystemMessage("当前没有正在执行的任务。");
        return;
      }

      await interruptTurn();
      return;
    }

    if (command.id === "model") {
      setIsModelPickerOpen(true);
      setIsApprovalPickerOpen(false);
      setModelPickerView("main");
      return;
    }

    if (command.id === "approval") {
      setIsApprovalPickerOpen(true);
      setIsModelPickerOpen(false);
      setModelPickerView("main");
      return;
    }

    if (command.id === "new") {
      await createSession();
      return;
    }

    if (command.id === "history") {
      setIsHistoryOpen(true);
      await loadSessions();
    }
  }

  async function runSlashInput() {
    const parsedCommand = readSlashCommandInput(draft);
    if (!parsedCommand) {
      return false;
    }

    const command = slashCommands.find((item) => item.command.slice(1) === parsedCommand.name);
    if (!command) {
      setError(`未知命令：/${parsedCommand.name}`);
      setDraft("");
      return true;
    }

    await runSlashCommand(command, parsedCommand.argument);
    return true;
  }

  const hasSession = Boolean(session);
  const visibleConversationTitle = hasSession ? currentConversationTitle || "等待第一句需求" : "未创建";
  const primaryActionText = isStreaming ? "中断" : "发送";

  function renderSelectionCheck(selected: boolean) {
    return (
      <span aria-hidden="true" className="modelPickerCheck">
        {selected ? "✓" : ""}
      </span>
    );
  }

  function renderApprovalPickerPanel() {
    if (!isApprovalPickerOpen) {
      return null;
    }

    return (
      <div className="approvalPanel" role="dialog" aria-label="选择 Codex 审批方式">
        <div className="approvalPanelTitle">
          <strong>应如何批准 Codex 操作？</strong>
          <span>了解更多</span>
        </div>
        <div className="approvalList">
          {approvalOptions.map((option) => {
            const selected = option.mode === approvalMode;
            return (
              <Button
                aria-pressed={selected}
                className="approvalOption"
                key={option.mode}
                onClick={() => {
                  setApprovalMode(option.mode);
                  setIsApprovalPickerOpen(false);
                }}
                variant="ghost"
              >
                <span aria-hidden="true" className={`approvalOptionGlyph approvalOptionGlyph-${option.mode}`} />
                <span className="approvalOptionText">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span aria-hidden="true" className="approvalOptionCheck">
                  {selected ? "✓" : ""}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderSlashPanel() {
    if (!isSlashPanelOpen) {
      return null;
    }

    return (
      <div className="slashPanel" role="listbox" aria-label="Codex 斜杠命令">
        {visibleSlashCommands.map((command, index) => {
          const selected = index === activeSlashIndex;
          return (
            <Button
              aria-selected={selected}
              className={`slashOption ${selected ? "slashOptionActive" : ""}`}
              key={command.id}
              onClick={() => void runSlashCommand(command)}
              onMouseEnter={() => setSlashActiveIndex(index)}
              role="option"
              variant="ghost"
            >
              <span aria-hidden="true" className="slashGlyph">
                {command.command.slice(1, 2).toUpperCase()}
              </span>
              <span className="slashText">
                <strong>{command.title}</strong>
                <small>{command.description}</small>
              </span>
              <span className="slashCommandText">{command.command}</span>
            </Button>
          );
        })}
      </div>
    );
  }

  function renderModelPickerPanel() {
    if (!isModelPickerOpen) {
      return null;
    }

    if (modelPickerView === "models") {
      return (
        <div className="modelPickerPanel" role="dialog" aria-label="选择 Codex 模型">
          <div className="modelPickerSubHeader">
            <Button onClick={() => setModelPickerView("main")} size="sm" variant="ghost">
              返回
            </Button>
            <strong>模型</strong>
          </div>
          <div className="modelPickerList">
            {codexModels.length > 0 ? (
              codexModels.map((model) => {
                const selected = model.model === codexSelection.model;
                return (
                  <Button
                    aria-pressed={selected}
                    className="modelPickerOption modelPickerOptionStack"
                    key={model.id || model.model}
                    onClick={() => selectModel(model)}
                    variant="ghost"
                  >
                    {renderSelectionCheck(selected)}
                    <span>
                      <strong>{formatModelDisplayName(model, model.model)}</strong>
                      {model.description ? <small>{model.description}</small> : null}
                    </span>
                  </Button>
                );
              })
            ) : (
              <div className="modelPickerEmpty">{isLoadingCodexOptions ? "正在读取模型" : "本地 Codex 未返回模型列表"}</div>
            )}
          </div>
        </div>
      );
    }

    if (modelPickerView === "speeds") {
      return (
        <div className="modelPickerPanel" role="dialog" aria-label="选择 Codex 速度">
          <div className="modelPickerSubHeader">
            <Button onClick={() => setModelPickerView("main")} size="sm" variant="ghost">
              返回
            </Button>
            <strong>速度</strong>
          </div>
          <div className="modelPickerList">
            {speedOptions.map((speed) => {
              const selected = speed.id === codexSelection.serviceTier;
              return (
                <Button
                  aria-pressed={selected}
                  className="modelPickerOption modelPickerOptionStack"
                  key={speed.id}
                  onClick={() => selectSpeed(speed.id)}
                  variant="ghost"
                >
                  {renderSelectionCheck(selected)}
                  <span>
                    <strong>{formatSpeedLabel(speed.id, speed.name)}</strong>
                    {speed.description ? <small>{speed.description}</small> : null}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="modelPickerPanel" role="dialog" aria-label="选择 Codex 模型和强度">
        <div className="modelPickerSectionLabel">智能</div>
        <div className="modelPickerList">
          {effortOptions.map((option) => {
            const selected = option.reasoningEffort === codexSelection.effort;
            return (
              <Button
                aria-pressed={selected}
                className="modelPickerOption"
                key={option.reasoningEffort}
                onClick={() => selectEffort(option.reasoningEffort)}
                variant="ghost"
              >
                {renderSelectionCheck(selected)}
                <span>{formatEffortLabel(option.reasoningEffort)}</span>
              </Button>
            );
          })}
        </div>

        <div className="modelPickerDivider" />

        <Button className="modelPickerNav" onClick={() => setModelPickerView("models")} variant="ghost">
          <span>
            <strong>模型</strong>
            <small>{formatModelDisplayName(selectedModel, codexSelection.model)}</small>
          </span>
          <span aria-hidden="true" className="modelPickerChevron">
            ›
          </span>
        </Button>

        <Button className="modelPickerNav" onClick={() => setModelPickerView("speeds")} variant="ghost">
          <span>
            <strong>速度</strong>
            <small>{formatSpeedLabel(selectedSpeed.id, selectedSpeed.name)}</small>
          </span>
          <span aria-hidden="true" className="modelPickerChevron">
            ›
          </span>
        </Button>
      </div>
    );
  }

  function renderHistoryList() {
    if (historyThreads.length === 0) {
      return <div className="emptyState">{isLoadingSessions ? "正在读取历史会话" : "暂无历史会话"}</div>;
    }

    return historyThreads.map((thread) => (
      <div className="historyRow" key={thread.id}>
        <div className="historyInfo">
          <strong>{getThreadTitle(thread)}</strong>
          <span>{formatThreadTime(thread.updatedAt)}</span>
          <span>{thread.cwd || "未记录 cwd"}</span>
        </div>
        <Button
          disabled={isRestoringSession || isCreatingSession || isStreaming}
          onClick={() => void resumeHistoryThread(thread.id)}
          size="sm"
          variant={session?.threadId === thread.id ? "success" : "secondary"}
        >
          {session?.threadId === thread.id ? "当前" : "恢复"}
        </Button>
      </div>
    ));
  }

  return (
    <main className="workspaceShell">
      <aside className="sidePane" aria-label="Codex 会话控制">
        <div className="sideHeader">
          <span className="eyebrow">Codex Bridge</span>
          <h1>AppServer 会话</h1>
        </div>

        <div className="sessionActions">
          <Button disabled={isCreatingSession || isStreaming || isRestoringSession} fullWidth onClick={() => void createSession()}>
            {isCreatingSession ? "创建中" : hasSession ? "新建会话" : "创建会话"}
          </Button>
          <Button disabled={isLoadingSessions || isRestoringSession} fullWidth onClick={() => void loadSessions()} variant="secondary">
            {isLoadingSessions ? "刷新中" : "刷新历史"}
          </Button>
        </div>

        <section className="historyPanel" aria-label="历史会话列表">
          <div className="panelHeader">
            <h2>历史会话</h2>
            <span>{historyThreads.length}</span>
          </div>
          <div className="historyList">{renderHistoryList()}</div>
        </section>

        <dl className="metaList">
          <div className="metaRow">
            <dt>Bridge</dt>
            <dd>{bridgeUrl}</dd>
          </div>
          <div className="metaRow">
            <dt>状态</dt>
            <dd>{statusText}</dd>
          </div>
          <div className="metaRow">
            <dt>内存会话</dt>
            <dd>{memorySessions.length}</dd>
          </div>
          <div className="metaRow">
            <dt>事件</dt>
            <dd>{eventCount}</dd>
          </div>
          <div className="metaRow">
            <dt>连接</dt>
            <dd>{connectionState}</dd>
          </div>
          <div className="metaRow">
            <dt>Session</dt>
            <dd>{session?.id ?? "未创建"}</dd>
          </div>
          <div className="metaRow">
            <dt>Thread</dt>
            <dd>{session?.threadId ?? "未创建"}</dd>
          </div>
        </dl>
      </aside>

      <section className="workArea" aria-label="Codex 工作区">
        <header className="streamHeader">
          <div className="currentWindow">
            <span className="currentWindowLabel">当前会话</span>
            <strong title={activeThreadId || undefined}>{visibleConversationTitle}</strong>
          </div>
          <div className="statePill">{hasSession ? statusText : "请先创建或恢复会话"}</div>
        </header>

        <div className="transcript" aria-live="polite">
          {messages.map((message) => (
            <article className={`message message-${message.role}`} key={message.id}>
              <span className="messageRole">{message.role === "user" ? "你" : message.role === "assistant" ? "Codex" : "系统"}</span>
              <div className="messageBody">{message.content || "..."}</div>
            </article>
          ))}
        </div>

        <div className="composerBar">
          {renderSlashPanel()}
          <div className="mobileSessionControls" aria-label="移动端会话控制">
            <Button
              aria-label="新建 Codex 会话"
              disabled={isCreatingSession || isStreaming || isRestoringSession}
              onClick={() => void createSession()}
              size="sm"
            >
              新建会话
            </Button>
            <Button
              aria-label="选择历史会话"
              disabled={isLoadingSessions || isRestoringSession}
              onClick={() => {
                setIsHistoryOpen(true);
                void loadSessions();
              }}
              size="sm"
              variant="secondary"
            >
              历史会话
            </Button>
          </div>
          <div className="approvalPicker" ref={approvalPickerRef}>
            <Button
              aria-expanded={isApprovalPickerOpen}
              aria-label={`选择 Codex 审批方式，当前为${selectedApprovalOption.title}`}
              className="approvalTrigger"
              onClick={() => {
                setIsApprovalPickerOpen((open) => !open);
                setIsModelPickerOpen(false);
                setModelPickerView("main");
              }}
              title={selectedApprovalOption.title}
              variant="secondary"
            >
              <span aria-hidden="true" className="approvalTriggerGlyph" />
            </Button>
            {renderApprovalPickerPanel()}
          </div>
          <Textarea
            aria-label="输入内容"
            className="promptArea"
            disabled={!session || isCreatingSession || isRestoringSession}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" && isSlashPanelOpen) {
                event.preventDefault();
                setSlashActiveIndex((index) => (index + 1) % visibleSlashCommands.length);
                return;
              }

              if (event.key === "ArrowUp" && isSlashPanelOpen) {
                event.preventDefault();
                setSlashActiveIndex((index) => (index - 1 + visibleSlashCommands.length) % visibleSlashCommands.length);
                return;
              }

              if (event.key === "Escape" && isSlashPanelOpen) {
                event.preventDefault();
                setDraft("");
                return;
              }

              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (activeSlashCommand) {
                  void runSlashCommand(activeSlashCommand);
                  return;
                }

                if (draft.trim().startsWith("/")) {
                  void runSlashInput();
                  return;
                }

                void sendMessage();
              }
            }}
            placeholder={session ? "输入要发送给 Codex 的需求" : "请先创建或恢复会话"}
            value={draft}
          />
          {error ? <div className="errorText">{error}</div> : null}
          <div className="composerActions">
            <div className="modelPicker" ref={modelPickerRef}>
              <Button
                aria-expanded={isModelPickerOpen}
                aria-label="选择 Codex 模型和强度"
                className="modelTrigger"
                disabled={isLoadingCodexOptions}
                onClick={() => {
                  setIsModelPickerOpen((open) => !open);
                  setIsApprovalPickerOpen(false);
                  setModelPickerView("main");
                }}
                variant="secondary"
              >
                {isLoadingCodexOptions ? "读取中" : modelTriggerText}
              </Button>
              {renderModelPickerPanel()}
            </div>
            <Button
              className="sendActionButton"
              disabled={isStreaming ? !session : !draft.trim() || !session}
              onClick={() => {
                if (isStreaming) {
                  void interruptTurn();
                  return;
                }

                void sendMessage();
              }}
              variant={isStreaming ? "secondary" : "success"}
            >
              {primaryActionText}
            </Button>
          </div>
        </div>
      </section>

      <Dialog
        className="historyPickerPanel"
        onClose={() => setIsHistoryOpen(false)}
        open={isHistoryOpen}
        title="选择会话"
        actions={
          <Button disabled={isLoadingSessions || isRestoringSession} onClick={() => void loadSessions()} variant="secondary">
            {isLoadingSessions ? "刷新中" : "刷新历史"}
          </Button>
        }
      >
        <div className="historyList historyListPicker">{renderHistoryList()}</div>
      </Dialog>
    </main>
  );
}
