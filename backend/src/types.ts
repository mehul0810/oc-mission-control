export type AgentStatus = 'active' | 'idle' | 'offline' | 'away';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

export interface Agent {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
}

export interface Project {
  id: string;
  name: string;
  slug?: string;
  status: 'active' | 'planning' | 'paused' | 'completed';
  ownerAgentId: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  agentId: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high' | 'critical' | 'p0' | 'p1' | 'p2' | 'p3';
  effortPoints?: number;
  dueDate?: string;
  slaDueAt?: string;
  blocker?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  topic: string;
  authorAgentId: string;
  content: string;
  createdAt: string;
}

export interface ActivityEvent {
  id: string;
  type: 'task' | 'project' | 'chat' | 'agent' | 'system';
  action: string;
  entityId: string;
  actorAgentId?: string;
  summary: string;
  createdAt: string;
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export type EventChannel = 'activity' | 'chat' | 'system';

export interface HeartbeatEvent {
  ts: string;
}

export interface StreamConnectedEvent {
  ts: string;
  heartbeatMs: number;
}

export interface EventPayloadMap {
  activity: ActivityEvent;
  chat: ChatMessage;
  system: StreamConnectedEvent | HeartbeatEvent;
}

export type EventPayload<T extends EventChannel> = {
  channel: T;
  data: EventPayloadMap[T];
};
