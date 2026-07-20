import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import type { Duplex } from "node:stream";
import { fileURLToPath } from "node:url";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue | undefined };
type JsonRpcId = string | number;

type JsonRpcMessage = JsonObject & {
  id?: JsonRpcId;
  method?: string;
  params?: JsonValue;
  result?: JsonValue;
  error?: JsonValue;
};

type PendingRequest = {
  method: string;
  resolve: (value: JsonValue) => void;
  reject: (error: Error) => void;
};

type PendingApproval = {
  id: string;
  sessionId: string;
  requestId: JsonRpcId;
  method: string;
  params: JsonValue | undefined;
  bridge: CodexBridge;
  createdAt: string;
};

type BridgeSession = {
  id: string;
  bridge: CodexBridge;
  threadId: string | null;
  currentTurnId: string | null;
  clients: Set<WebSocketClient>;
  eventLog: JsonObject[];
  createdAt: string;
  updatedAt: string;
};

type CodexConfigDefaults = {
  model: string;
  modelProvider: string | null;
  effort: string | null;
  serviceTier: string | null;
};

const appServerRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(appServerRoot, "..");
const defaultCodexCwd = process.env.CODEX_BRIDGE_DEFAULT_CWD ?? workspaceRoot;
const codexCommand = process.env.CODEX_BRIDGE_CODEX_BIN ?? "codex";
const host = process.env.CODEX_BRIDGE_HOST ?? process.env.HOST ?? "127.0.0.1";
const port = readPort(process.env.CODEX_BRIDGE_PORT ?? process.env.PORT, 3100);
const corsOrigin = process.env.CODEX_BRIDGE_CORS_ORIGIN ?? "*";
const sessions = new Map<string, BridgeSession>();
const pendingApprovals = new Map<string, PendingApproval>();

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: JsonValue,
  ) {
    super(message);
  }
}

class CodexBridge {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly pendingRequests = new Map<JsonRpcId, PendingRequest>();
  private nextRequestId = 1;
  private stdoutBuffer = "";
  private closed = false;

  onMessage: ((message: JsonRpcMessage) => void) | null = null;
  onServerRequest: ((message: JsonRpcMessage) => void) | null = null;
  onLog: ((stream: "stderr" | "stdout", text: string) => void) | null = null;
  onExit: ((code: number | null, signal: NodeJS.Signals | null) => void) | null = null;

  constructor() {
    this.proc = spawn(codexCommand, ["app-server"], {
      cwd: defaultCodexCwd,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.proc.stdout.setEncoding("utf8");
    this.proc.stderr.setEncoding("utf8");

    this.proc.stdout.on("data", (chunk: string) => {
      this.readStdout(chunk);
    });

    this.proc.stderr.on("data", (chunk: string) => {
      this.onLog?.("stderr", chunk);
    });

    this.proc.on("error", (error) => {
      this.rejectAll(error);
      this.onLog?.("stderr", `${error.message}\n`);
    });

    this.proc.on("exit", (code, signal) => {
      this.closed = true;
      this.rejectAll(new Error(`codex app-server exited: code=${code ?? "null"} signal=${signal ?? "null"}`));
      this.onExit?.(code, signal);
    });
  }

  async initialize(): Promise<JsonValue> {
    const result = await this.request("initialize", {
      clientInfo: {
        name: "person_workspace_codex_bridge",
        title: "Person Workspace Codex Bridge",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    this.notify("initialized", {});
    return result;
  }

  request(method: string, params: JsonValue | undefined): Promise<JsonValue> {
    if (this.closed) {
      return Promise.reject(new Error("codex app-server is not running"));
    }

    const id = this.nextRequestId;
    this.nextRequestId += 1;

    return new Promise((resolveRequest, rejectRequest) => {
      this.pendingRequests.set(id, {
        method,
        resolve: resolveRequest,
        reject: rejectRequest,
      });
      this.write(params === undefined ? { id, method } : { id, method, params });
    });
  }

  notify(method: string, params: JsonValue | undefined): void {
    this.write(params === undefined ? { method } : { method, params });
  }

  respond(requestId: JsonRpcId, result: JsonValue): void {
    this.write({ id: requestId, result });
  }

  respondError(requestId: JsonRpcId, code: number, message: string): void {
    this.write({
      id: requestId,
      error: {
        code,
        message,
      },
    });
  }

  isRunning(): boolean {
    return !this.closed;
  }

  shutdown(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.proc.kill("SIGTERM");
  }

  private write(message: JsonObject): void {
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private readStdout(chunk: string): void {
    this.stdoutBuffer += chunk;

    let newlineIndex = this.stdoutBuffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        this.readLine(line);
      }
      newlineIndex = this.stdoutBuffer.indexOf("\n");
    }
  }

  private readLine(line: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.onLog?.("stdout", `Failed to parse JSON-RPC line: ${message}\n${line}\n`);
      return;
    }

    if (!isJsonObject(parsed)) {
      this.onLog?.("stdout", `Ignored non-object JSON-RPC line: ${line}\n`);
      return;
    }

    const message = parsed as JsonRpcMessage;
    this.onMessage?.(message);

    if (isJsonRpcResponse(message)) {
      this.handleResponse(message);
      return;
    }

    if (typeof message.method === "string" && message.id !== undefined) {
      this.onServerRequest?.(message);
    }
  }

  private handleResponse(message: JsonRpcMessage): void {
    if (message.id === undefined) {
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    this.pendingRequests.delete(message.id);
    if (message.error !== undefined) {
      pending.reject(new Error(formatJsonRpcError(pending.method, message.error)));
      return;
    }

    pending.resolve(message.result ?? null);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

class WebSocketClient {
  private closed = false;

  constructor(private readonly socket: Duplex) {
    this.socket.on("data", (chunk: Buffer) => {
      if (chunk.length > 0 && (chunk[0] & 0x0f) === 0x08) {
        this.close();
      }
    });
    this.socket.on("error", () => {
      this.closed = true;
    });
    this.socket.on("close", () => {
      this.closed = true;
    });
  }

  send(value: JsonValue): void {
    if (this.closed) {
      return;
    }
    this.socket.write(encodeWebSocketTextFrame(JSON.stringify(value)));
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.socket.write(Buffer.from([0x88, 0x00]));
    this.socket.end();
  }
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    sendError(response, error);
  });
});

server.on("upgrade", (request, socket) => {
  handleUpgrade(request, socket);
});

server.on("error", (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Codex Bridge failed to listen: ${message}`);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`Codex Bridge listening on http://${host}:${port}`);
  console.log(`Default Codex cwd: ${defaultCodexCwd}`);
});

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const pathname = stripTrailingSlash(url.pathname);

  if (request.method === "GET" && pathname === "/codex/options") {
    const result = await readCodexOptions();
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "GET" && pathname === "/sessions") {
    const result = await listSessions(url);
    sendJson(response, 200, result);
    return;
  }

  if (request.method === "POST" && pathname === "/sessions") {
    const body = await readJsonBody(request);
    const session = await createCodexSession(body);
    sendJson(response, 201, summarizeSession(session));
    return;
  }

  const detailSessionId = matchPath(pathname, /^\/sessions\/([^/]+)$/);
  if (request.method === "GET" && detailSessionId) {
    const result = await readSessionDetail(detailSessionId);
    sendJson(response, 200, result);
    return;
  }

  const resumeSessionId = matchPath(pathname, /^\/sessions\/([^/]+)\/resume$/);
  if (request.method === "POST" && resumeSessionId) {
    const body = await readJsonBody(request);
    const result = await resumeCodexSession(resumeSessionId, body);
    sendJson(response, result.reused ? 200 : 201, result);
    return;
  }

  const turnSessionId = matchPath(pathname, /^\/sessions\/([^/]+)\/turns$/);
  if (request.method === "POST" && turnSessionId) {
    const session = getSession(turnSessionId);
    const body = await readJsonBody(request);
    const result = await startTurn(session, body);
    sendJson(response, 202, result);
    return;
  }

  const interruptSessionId = matchPath(pathname, /^\/sessions\/([^/]+)\/interrupt$/);
  if (request.method === "POST" && interruptSessionId) {
    const session = getSession(interruptSessionId);
    const body = await readJsonBody(request);
    const result = await interruptTurn(session, body);
    sendJson(response, 200, result);
    return;
  }

  const compactSessionId = matchPath(pathname, /^\/sessions\/([^/]+)\/compact$/);
  if (request.method === "POST" && compactSessionId) {
    const session = getSession(compactSessionId);
    const result = await compactThread(session);
    sendJson(response, 202, result);
    return;
  }

  const goalSessionId = matchPath(pathname, /^\/sessions\/([^/]+)\/goal$/);
  if (request.method === "POST" && goalSessionId) {
    const session = getSession(goalSessionId);
    const body = await readJsonBody(request);
    const result = await manageThreadGoal(session, body);
    sendJson(response, 200, result);
    return;
  }

  const approvalId = matchPath(pathname, /^\/approvals\/([^/]+)$/);
  if (request.method === "POST" && approvalId) {
    const body = await readJsonBody(request);
    const result = resolveApproval(approvalId, body);
    sendJson(response, 200, result);
    return;
  }

  throw new HttpError(404, "Route not found");
}

function handleUpgrade(request: IncomingMessage, socket: Duplex): void {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const sessionId = matchPath(stripTrailingSlash(url.pathname), /^\/sessions\/([^/]+)\/events$/);
  const session = sessionId ? sessions.get(sessionId) : undefined;

  if (!session) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }

  const websocketKey = request.headers["sec-websocket-key"];
  if (typeof websocketKey !== "string") {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  const acceptKey = createHash("sha1")
    .update(`${websocketKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${acceptKey}`,
      "\r\n",
    ].join("\r\n"),
  );

  const client = new WebSocketClient(socket);
  session.clients.add(client);

  socket.on("close", () => {
    session.clients.delete(client);
  });

  client.send({
    type: "connected",
    sessionId: session.id,
    threadId: session.threadId,
    replayedEvents: session.eventLog.length,
  });

  for (const event of session.eventLog) {
    client.send({
      ...event,
      replay: true,
    });
  }
}

async function createCodexSession(body: JsonObject): Promise<BridgeSession> {
  const bridge = new CodexBridge();

  try {
    await bridge.initialize();
    const threadStartResult = await bridge.request("thread/start", buildThreadStartParams(body));
    const threadId = readRequiredId(threadStartResult, "thread");
    const session = createBridgeSession(threadId, bridge);
    sessions.set(session.id, session);
    attachBridgeHandlers(session);
    publish(session, {
      type: "session_created",
      threadId,
      result: threadStartResult,
    });
    return session;
  } catch (error) {
    bridge.shutdown();
    throw error;
  }
}

async function resumeCodexSession(id: string, body: JsonObject): Promise<JsonObject> {
  const existing = sessions.get(id);
  if (existing?.bridge.isRunning()) {
    const detail = await readThreadDetail(existing.threadId ?? id, existing.bridge);
    const thread = readDetailThread(detail);
    return {
      reused: true,
      session: summarizeSession(existing),
      thread,
      turns: readThreadTurns(thread),
    };
  }

  if (existing) {
    existing.bridge.shutdown();
    sessions.delete(existing.id);
  }

  const threadId = existing?.threadId ?? id;
  const bridge = new CodexBridge();

  try {
    await bridge.initialize();
    const resumeResult = await bridge.request("thread/resume", buildThreadResumeParams(threadId, body));
    const resumedThreadId = readRequiredId(resumeResult, "thread");
    const session = createBridgeSession(resumedThreadId, bridge);
    sessions.set(session.id, session);
    attachBridgeHandlers(session);
    publish(session, {
      type: "session_resumed",
      threadId: resumedThreadId,
      result: resumeResult,
    });

    const thread = readResponseThread(resumeResult);
    return {
      reused: false,
      session: summarizeSession(session),
      thread,
      turns: readThreadTurns(thread),
      result: resumeResult,
    };
  } catch (error) {
    bridge.shutdown();
    throw error;
  }
}

async function startTurn(session: BridgeSession, body: JsonObject): Promise<JsonObject> {
  if (!session.threadId) {
    throw new HttpError(409, "Session thread is not ready");
  }

  const params = buildTurnStartParams(session.threadId, body);
  const result = await session.bridge.request("turn/start", params);
  const turnId = readRequiredId(result, "turn");
  session.currentTurnId = turnId;
  session.updatedAt = new Date().toISOString();

  publish(session, {
    type: "turn_submitted",
    threadId: session.threadId,
    turnId,
    result,
  });

  return {
    sessionId: session.id,
    threadId: session.threadId,
    turnId,
    result,
  };
}

async function interruptTurn(session: BridgeSession, body: JsonObject): Promise<JsonObject> {
  if (!session.threadId) {
    throw new HttpError(409, "Session thread is not ready");
  }

  const turnId = typeof body.turnId === "string" ? body.turnId : session.currentTurnId;
  if (!turnId) {
    throw new HttpError(409, "No active turn to interrupt");
  }

  const result = await session.bridge.request("turn/interrupt", {
    threadId: session.threadId,
    turnId,
  });

  publish(session, {
    type: "turn_interrupt_requested",
    threadId: session.threadId,
    turnId,
    result,
  });

  return {
    sessionId: session.id,
    threadId: session.threadId,
    turnId,
    result,
  };
}

async function compactThread(session: BridgeSession): Promise<JsonObject> {
  if (!session.threadId) {
    throw new HttpError(409, "Session thread is not ready");
  }

  const result = await session.bridge.request("thread/compact/start", {
    threadId: session.threadId,
  });
  session.updatedAt = new Date().toISOString();

  publish(session, {
    type: "thread_compact_requested",
    threadId: session.threadId,
    result,
  });

  return {
    sessionId: session.id,
    threadId: session.threadId,
    result,
  };
}

async function manageThreadGoal(session: BridgeSession, body: JsonObject): Promise<JsonObject> {
  if (!session.threadId) {
    throw new HttpError(409, "Session thread is not ready");
  }

  const action = typeof body.action === "string" ? body.action : "set";
  const params: JsonObject = {
    threadId: session.threadId,
  };
  let method = "thread/goal/set";

  if (action === "clear") {
    method = "thread/goal/clear";
  } else if (action === "get") {
    method = "thread/goal/get";
  } else {
    const objective = typeof body.objective === "string" ? body.objective.trim() : "";
    if (!objective) {
      throw new HttpError(400, "Goal objective is required");
    }

    params.objective = objective;
    params.status = typeof body.status === "string" ? body.status : "active";
    if (typeof body.tokenBudget === "number" && Number.isFinite(body.tokenBudget)) {
      params.tokenBudget = body.tokenBudget;
    }
  }

  const result = await session.bridge.request(method, params);
  session.updatedAt = new Date().toISOString();

  publish(session, {
    type: `thread_goal_${action}`,
    threadId: session.threadId,
    result,
  });

  return {
    sessionId: session.id,
    threadId: session.threadId,
    action,
    result,
  };
}

function resolveApproval(approvalId: string, body: JsonObject): JsonObject {
  const approval = pendingApprovals.get(approvalId);
  if (!approval) {
    throw new HttpError(404, "Approval request not found");
  }

  if (body.error !== undefined) {
    const error = isJsonObject(body.error)
      ? body.error
      : {
          code: -32000,
          message: String(body.error),
        };
    approval.bridge.respondError(
      approval.requestId,
      typeof error.code === "number" ? error.code : -32000,
      typeof error.message === "string" ? error.message : "Approval rejected",
    );
    pendingApprovals.delete(approvalId);
    publishApprovalResolved(approval, null, error);
    return {
      id: approvalId,
      status: "sent",
      error,
    };
  }

  const result = buildApprovalResult(approval, body);
  approval.bridge.respond(approval.requestId, result);
  pendingApprovals.delete(approvalId);
  publishApprovalResolved(approval, result, null);

  return {
    id: approvalId,
    status: "sent",
    result,
  };
}

function attachBridgeHandlers(session: BridgeSession): void {
  session.bridge.onMessage = (message) => {
    updateSessionFromCodexMessage(session, message);
    publish(session, {
      type: classifyCodexMessage(message),
      message,
    });
  };

  session.bridge.onServerRequest = (message) => {
    const approvalId = randomUUID();
    const pending: PendingApproval = {
      id: approvalId,
      sessionId: session.id,
      requestId: message.id as JsonRpcId,
      method: message.method as string,
      params: message.params,
      bridge: session.bridge,
      createdAt: new Date().toISOString(),
    };
    pendingApprovals.set(approvalId, pending);

    publish(session, {
      type: isApprovalMethod(pending.method) ? "approval_request" : "server_request",
      approvalId,
      requestId: pending.requestId,
      method: pending.method,
      params: pending.params,
    });
  };

  session.bridge.onLog = (stream, text) => {
    publish(session, {
      type: "codex_log",
      stream,
      text,
    });
  };

  session.bridge.onExit = (code, signal) => {
    for (const [approvalId, approval] of pendingApprovals) {
      if (approval.sessionId === session.id) {
        pendingApprovals.delete(approvalId);
      }
    }
    publish(session, {
      type: "codex_exit",
      code,
      signal,
    });
  };
}

function updateSessionFromCodexMessage(session: BridgeSession, message: JsonRpcMessage): void {
  if (message.method === "turn/started" && isJsonObject(message.params)) {
    const turnId = readOptionalNestedId(message.params, "turn");
    if (turnId) {
      session.currentTurnId = turnId;
    }
  }

  if (message.method === "turn/completed" && isJsonObject(message.params)) {
    const turnId = readOptionalNestedId(message.params, "turn");
    if (turnId && session.currentTurnId === turnId) {
      session.currentTurnId = null;
    }
  }

  session.updatedAt = new Date().toISOString();
}

function publish(session: BridgeSession, event: JsonObject): void {
  const payload: JsonObject = {
    ...event,
    sessionId: session.id,
    emittedAt: new Date().toISOString(),
  };

  session.eventLog.push(payload);
  if (session.eventLog.length > 500) {
    session.eventLog.shift();
  }

  for (const client of session.clients) {
    client.send(payload);
  }
}

function publishApprovalResolved(
  approval: PendingApproval,
  result: JsonValue | null,
  error: JsonObject | null,
): void {
  const session = sessions.get(approval.sessionId);
  if (!session) {
    return;
  }

  publish(session, {
    type: "approval_resolved",
    approvalId: approval.id,
    requestId: approval.requestId,
    method: approval.method,
    result,
    error,
  });
}

function buildThreadStartParams(body: JsonObject): JsonObject {
  const params: JsonObject = {
    cwd: typeof body.cwd === "string" ? body.cwd : defaultCodexCwd,
  };
  copyJsonFields(body, params, [
    "model",
    "modelProvider",
    "serviceTier",
    "approvalPolicy",
    "approvalsReviewer",
    "sandbox",
    "config",
    "serviceName",
    "baseInstructions",
    "developerInstructions",
    "personality",
    "ephemeral",
    "sessionStartSource",
    "threadSource",
  ]);
  return params;
}

function buildThreadResumeParams(threadId: string, body: JsonObject): JsonObject {
  const params: JsonObject = {
    threadId,
  };
  copyJsonFields(body, params, [
    "model",
    "modelProvider",
    "serviceTier",
    "cwd",
    "approvalPolicy",
    "approvalsReviewer",
    "sandbox",
    "config",
    "baseInstructions",
    "developerInstructions",
    "personality",
  ]);
  return params;
}

function buildTurnStartParams(threadId: string, body: JsonObject): JsonObject {
  const params: JsonObject = {
    threadId,
    input: readTurnInput(body),
  };
  copyJsonFields(body, params, [
    "clientUserMessageId",
    "cwd",
    "approvalPolicy",
    "approvalsReviewer",
    "sandboxPolicy",
    "model",
    "serviceTier",
    "effort",
    "summary",
    "personality",
    "outputSchema",
  ]);
  return params;
}

function readTurnInput(body: JsonObject): JsonValue[] {
  if (Array.isArray(body.input)) {
    return body.input;
  }

  const text = typeof body.message === "string" ? body.message : body.prompt;
  if (typeof text !== "string" || text.trim().length === 0) {
    throw new HttpError(400, "Request body must include message, prompt, or input");
  }

  return [
    {
      type: "text",
      text,
      text_elements: [],
    },
  ];
}

function buildApprovalResult(approval: PendingApproval, body: JsonObject): JsonValue {
  if (body.result !== undefined) {
    return body.result;
  }

  if (approval.method === "item/permissions/requestApproval") {
    return buildPermissionApprovalResult(approval, body);
  }

  const approved = readApprovalBoolean(body);
  const decision = body.decision;

  if (approval.method === "execCommandApproval" || approval.method === "applyPatchApproval") {
    return {
      decision: typeof decision === "string" ? decision : approved ? "approved" : "denied",
    };
  }

  if (
    approval.method === "item/commandExecution/requestApproval" ||
    approval.method === "item/fileChange/requestApproval"
  ) {
    return {
      decision: typeof decision === "string" ? decision : approved ? "accept" : "decline",
    };
  }

  throw new HttpError(400, "Unsupported server request requires explicit result");
}

function buildPermissionApprovalResult(approval: PendingApproval, body: JsonObject): JsonObject {
  const approved = readApprovalBoolean(body);
  const scope = body.scope === "session" ? "session" : "turn";

  if (!approved) {
    return {
      permissions: {},
      scope,
    };
  }

  if (isJsonObject(body.permissions)) {
    return {
      permissions: body.permissions,
      scope,
      strictAutoReview: typeof body.strictAutoReview === "boolean" ? body.strictAutoReview : undefined,
    };
  }

  const requestedPermissions =
    isJsonObject(approval.params) && isJsonObject(approval.params.permissions)
      ? approval.params.permissions
      : {};

  const granted: JsonObject = {};
  if (isJsonObject(requestedPermissions.network)) {
    granted.network = requestedPermissions.network;
  }
  if (isJsonObject(requestedPermissions.fileSystem)) {
    granted.fileSystem = requestedPermissions.fileSystem;
  }

  return {
    permissions: granted,
    scope,
    strictAutoReview: typeof body.strictAutoReview === "boolean" ? body.strictAutoReview : undefined,
  };
}

function readApprovalBoolean(body: JsonObject): boolean {
  if (typeof body.approved === "boolean") {
    return body.approved;
  }

  if (typeof body.decision === "string") {
    return !["decline", "denied", "abort", "cancel", "timed_out"].includes(body.decision);
  }

  throw new HttpError(400, "Approval body must include approved, decision, result, or error");
}

function copyJsonFields(source: JsonObject, target: JsonObject, fields: readonly string[]): void {
  for (const field of fields) {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  }
}

async function listSessions(url: URL): Promise<JsonObject> {
  const limit = readPositiveInteger(url.searchParams.get("limit"), 50, 200);
  const cursor = url.searchParams.get("cursor");
  const searchTerm = url.searchParams.get("searchTerm");

  const threadList = await withTemporaryBridge((bridge) =>
    bridge.request("thread/list", {
      limit,
      cursor: cursor || undefined,
      sortKey: "updated_at",
      sortDirection: "desc",
      searchTerm: searchTerm || undefined,
    }),
  );

  const threads = readThreadList(threadList);

  return {
    sessions: Array.from(sessions.values()).map(summarizeSession),
    threads: threads.map(summarizeThread),
    nextCursor: isJsonObject(threadList) && typeof threadList.nextCursor === "string" ? threadList.nextCursor : null,
    backwardsCursor:
      isJsonObject(threadList) && typeof threadList.backwardsCursor === "string" ? threadList.backwardsCursor : null,
  };
}

async function readCodexOptions(): Promise<JsonObject> {
  return withTemporaryBridge(async (bridge) => {
    const [configResult, modelListResult] = await Promise.all([
      bridge.request("config/read", {
        includeLayers: false,
        cwd: defaultCodexCwd,
      }),
      bridge.request("model/list", {
        limit: 100,
        includeHidden: false,
      }),
    ]);
    const config = readConfig(configResult);
    const models = readModelOptions(modelListResult);
    const defaults = readCodexConfigDefaults(config, models);

    return {
      defaults,
      models,
      cwd: defaultCodexCwd,
      source: "codex-app-server",
    };
  });
}

function readConfig(value: JsonValue): JsonObject {
  if (!isJsonObject(value) || !isJsonObject(value.config)) {
    return {};
  }

  return value.config;
}

function readCodexConfigDefaults(config: JsonObject, models: JsonObject[]): CodexConfigDefaults {
  const configuredModel = typeof config.model === "string" ? config.model : "";
  const defaultModel = models.find((model) => model.isDefault === true);
  const firstModel = models[0];
  const model =
    configuredModel ||
    (typeof defaultModel?.model === "string" ? defaultModel.model : "") ||
    (typeof firstModel?.model === "string" ? firstModel.model : "");

  return {
    model,
    modelProvider: typeof config.model_provider === "string" ? config.model_provider : null,
    effort: typeof config.model_reasoning_effort === "string" ? config.model_reasoning_effort : null,
    serviceTier: typeof config.service_tier === "string" ? config.service_tier : null,
  };
}

function readModelOptions(value: JsonValue): JsonObject[] {
  if (!isJsonObject(value) || !Array.isArray(value.data)) {
    return [];
  }

  return value.data.filter(isJsonObject).map(normalizeModelOption);
}

function normalizeModelOption(model: JsonObject): JsonObject {
  const id = typeof model.id === "string" ? model.id : typeof model.model === "string" ? model.model : "";
  const modelName = typeof model.model === "string" ? model.model : id;
  const displayName = typeof model.displayName === "string" ? model.displayName : modelName;

  return {
    id,
    model: modelName,
    displayName,
    description: typeof model.description === "string" ? model.description : "",
    hidden: typeof model.hidden === "boolean" ? model.hidden : false,
    supportedReasoningEfforts: readReasoningEffortOptions(model.supportedReasoningEfforts),
    defaultReasoningEffort:
      typeof model.defaultReasoningEffort === "string" ? model.defaultReasoningEffort : null,
    serviceTiers: readServiceTierOptions(model.serviceTiers),
    defaultServiceTier: typeof model.defaultServiceTier === "string" ? model.defaultServiceTier : null,
    isDefault: typeof model.isDefault === "boolean" ? model.isDefault : false,
  };
}

function readReasoningEffortOptions(value: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isJsonObject).map((option) => ({
    reasoningEffort: typeof option.reasoningEffort === "string" ? option.reasoningEffort : "",
    description: typeof option.description === "string" ? option.description : "",
  }));
}

function readServiceTierOptions(value: JsonValue | undefined): JsonObject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isJsonObject).map((option) => ({
    id: typeof option.id === "string" ? option.id : "",
    name: typeof option.name === "string" ? option.name : "",
    description: typeof option.description === "string" ? option.description : "",
  }));
}

async function readSessionDetail(id: string): Promise<JsonObject> {
  const session = sessions.get(id);
  const threadId = session?.threadId ?? id;
  const detail = await readThreadDetail(threadId, session?.bridge.isRunning() ? session.bridge : undefined);
  const thread = readDetailThread(detail);

  return {
    session: session ? summarizeSession(session) : null,
    thread,
    turns: readThreadTurns(thread),
  };
}

async function readThreadDetail(threadId: string, bridge?: CodexBridge): Promise<JsonObject> {
  if (bridge) {
    const result = await bridge.request("thread/read", {
      threadId,
      includeTurns: true,
    });
    return readThreadDetailResponse(result);
  }

  return withTemporaryBridge(async (temporaryBridge) => {
    const result = await temporaryBridge.request("thread/read", {
      threadId,
      includeTurns: true,
    });
    return readThreadDetailResponse(result);
  });
}

async function withTemporaryBridge<T>(callback: (bridge: CodexBridge) => Promise<T>): Promise<T> {
  const bridge = new CodexBridge();
  try {
    await bridge.initialize();
    return await callback(bridge);
  } finally {
    bridge.shutdown();
  }
}

function createBridgeSession(threadId: string, bridge: CodexBridge): BridgeSession {
  const now = new Date().toISOString();
  return {
    id: threadId,
    bridge,
    threadId,
    currentTurnId: null,
    clients: new Set(),
    eventLog: [],
    createdAt: now,
    updatedAt: now,
  };
}

function summarizeSession(session: BridgeSession): JsonObject {
  return {
    id: session.id,
    threadId: session.threadId,
    currentTurnId: session.currentTurnId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    eventCount: session.eventLog.length,
    clientCount: session.clients.size,
    running: session.bridge.isRunning(),
  };
}

function summarizeThread(thread: JsonObject): JsonObject {
  const id = typeof thread.id === "string" ? thread.id : "";
  return {
    id,
    sessionId: typeof thread.sessionId === "string" ? thread.sessionId : null,
    name: typeof thread.name === "string" ? thread.name : null,
    preview: typeof thread.preview === "string" ? thread.preview : "",
    cwd: typeof thread.cwd === "string" ? thread.cwd : "",
    modelProvider: typeof thread.modelProvider === "string" ? thread.modelProvider : "",
    source: typeof thread.source === "string" ? thread.source : "",
    threadSource: typeof thread.threadSource === "string" ? thread.threadSource : null,
    status: typeof thread.status === "string" ? thread.status : "",
    path: typeof thread.path === "string" ? thread.path : null,
    createdAt: typeof thread.createdAt === "number" ? thread.createdAt : null,
    updatedAt: typeof thread.updatedAt === "number" ? thread.updatedAt : null,
    recencyAt: typeof thread.recencyAt === "number" ? thread.recencyAt : null,
    liveSessionId: id && sessions.has(id) ? id : null,
  };
}

function readThreadList(value: JsonValue): JsonObject[] {
  if (!isJsonObject(value) || !Array.isArray(value.data)) {
    return [];
  }

  return value.data.filter(isJsonObject);
}

function readThreadDetailResponse(value: JsonValue): JsonObject {
  return {
    thread: readResponseThread(value),
  };
}

function readDetailThread(detail: JsonObject): JsonObject | null {
  return isJsonObject(detail.thread) ? detail.thread : null;
}

function readResponseThread(value: JsonValue): JsonObject | null {
  if (!isJsonObject(value) || !isJsonObject(value.thread)) {
    return null;
  }

  return value.thread;
}

function readThreadTurns(thread: JsonObject | null): JsonValue[] {
  return thread && Array.isArray(thread.turns) ? thread.turns : [];
}

async function readJsonBody(request: IncomingMessage): Promise<JsonObject> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buffer.length;
    if (size > 1024 * 1024) {
      throw new HttpError(413, "Request body is too large");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new HttpError(400, `Invalid JSON body: ${message}`);
  }

  if (!isJsonObject(parsed)) {
    throw new HttpError(400, "JSON body must be an object");
  }

  return parsed;
}

function sendJson(response: ServerResponse, status: number, body: JsonValue): void {
  setCorsHeaders(response);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: unknown): void {
  if (response.headersSent) {
    response.end();
    return;
  }

  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Internal server error";
  const details = error instanceof HttpError ? error.details : undefined;

  sendJson(response, status, {
    error: {
      message,
      details,
    },
  });
}

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", corsOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getSession(id: string): BridgeSession {
  const session = sessions.get(id);
  if (!session) {
    throw new HttpError(404, "Session not found");
  }
  return session;
}

function matchPath(pathname: string, pattern: RegExp): string | null {
  const match = pattern.exec(pathname);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonRpcResponse(message: JsonRpcMessage): boolean {
  return message.id !== undefined && message.method === undefined && (message.result !== undefined || message.error !== undefined);
}

function classifyCodexMessage(message: JsonRpcMessage): string {
  if (isJsonRpcResponse(message)) {
    return "codex_response";
  }
  if (typeof message.method === "string" && message.id !== undefined) {
    return isApprovalMethod(message.method) ? "codex_approval_request" : "codex_server_request";
  }
  if (typeof message.method === "string") {
    return "codex_notification";
  }
  return "codex_message";
}

function isApprovalMethod(method: string): boolean {
  return (
    method === "item/commandExecution/requestApproval" ||
    method === "item/fileChange/requestApproval" ||
    method === "item/permissions/requestApproval" ||
    method === "execCommandApproval" ||
    method === "applyPatchApproval"
  );
}

function readRequiredId(value: JsonValue, key: string): string {
  const id = readOptionalNestedId(value, key);
  if (!id) {
    throw new HttpError(502, `Codex response did not include ${key}.id`, value);
  }
  return id;
}

function readOptionalNestedId(value: JsonValue, key: string): string | null {
  if (!isJsonObject(value) || !isJsonObject(value[key])) {
    return null;
  }

  const id = value[key].id;
  return typeof id === "string" ? id : null;
}

function formatJsonRpcError(method: string, error: JsonValue): string {
  if (isJsonObject(error) && typeof error.message === "string") {
    return `${method} failed: ${error.message}`;
  }
  return `${method} failed: ${JSON.stringify(error)}`;
}

function encodeWebSocketTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), payload]);
  }

  if (length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
}

function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveInteger(value: string | null, fallback: number, max: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, shutting down Codex Bridge`);
  for (const session of sessions.values()) {
    session.bridge.shutdown();
    for (const client of session.clients) {
      client.close();
    }
  }
  server.close(() => {
    process.exit(0);
  });
}
