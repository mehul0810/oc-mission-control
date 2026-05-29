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

export type DependencyType = 'hard' | 'soft';

export interface WorkItemDependency {
  id: string;
  workItemId: string;
  dependsOnWorkItemId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  topic: string;
  authorAgentId: string;
  content: string;
  createdAt: string;
}

export interface CollabThread {
  id: string;
  projectId: string;
  title: string;
  createdByAgentId: string;
  createdAt: string;
}

export interface CollabMessage {
  id: string;
  threadId: string;
  projectId: string;
  actorAgentId: string;
  body: string;
  mentions: string[];
  createdAt: string;
}

export type DecisionState = 'open' | 'decided' | 'superseded';

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  context?: string;
  state: DecisionState;
  resolution?: string;
  decidedByAgentId?: string;
  supersededByDecisionId?: string;
  createdByAgentId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DecisionTransitionEvent {
  type: 'decision.transitioned';
  id: string;
  projectId: string;
  fromState: DecisionState;
  toState: DecisionState;
  actorAgentId: string;
  resolution?: string;
  decidedByAgentId?: string;
  supersededByDecisionId?: string;
  transitionedAt: string;
}

export interface OutboxEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CollabMessageCreatedEvent {
  type: 'collab.message.created';
  id: string;
  threadId: string;
  projectId: string;
  actorAgentId: string;
  body: string;
  mentions: string[];
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

export interface AuditEvent {
  id: string;
  actorId?: string;
  entityType: 'task' | 'project' | 'chat' | 'agent' | 'system' | 'decision' | 'dependency';
  entityId: string;
  action: string;
  projectId?: string;
  summary: string;
  occurredAt: string;
  payload: Record<string, unknown>;
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
  chat: ChatMessage | CollabMessageCreatedEvent;
  system: StreamConnectedEvent | HeartbeatEvent;
}

export type EventPayload<T extends EventChannel> = {
  channel: T;
  data: EventPayloadMap[T];
};
