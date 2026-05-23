import { agents as seedAgents, projects as seedProjects, tasks as seedTasks } from './seed';
import type {
  ActivityEvent,
  Agent,
  AgentStatus,
  ChatMessage,
  CollabMessageCreatedEvent,
  CollabMessage,
  CollabThread,
  Decision,
  DependencyType,
  DecisionTransitionEvent,
  EventChannel,
  EventPayload,
  OutboxEvent,
  Project,
  Task,
  TaskStatus,
  WorkItemDependency
} from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const db: {
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  chatMessages: ChatMessage[];
  collabThreads: CollabThread[];
  collabMessages: CollabMessage[];
  decisions: Decision[];
  workItemDependencies: WorkItemDependency[];
  outboxEvents: OutboxEvent[];
  activities: ActivityEvent[];
} = {
  agents: clone(seedAgents),
  projects: clone(seedProjects),
  tasks: clone(seedTasks),
  chatMessages: [
    { id: makeId('msg'), topic: 'general', authorAgentId: 'agent-jarvis', content: 'Mission Control channel live.', createdAt: nowIso() }
  ],
  collabThreads: [
    {
      id: 'thread-wave2-collab',
      projectId: 'project-mc',
      title: 'Wave 2 Collaboration API',
      createdByAgentId: 'agent-jarvis',
      createdAt: nowIso()
    }
  ],
  collabMessages: [],
  decisions: [],
  workItemDependencies: [],
  outboxEvents: [],
  activities: []
};

export const eventBus = {
  listeners: new Set<(payload: EventPayload<EventChannel>) => void>(),
  emit<T extends EventChannel>(channel: T, data: EventPayload<T>['data']) {
    this.listeners.forEach((listener) => listener({ channel, data } as EventPayload<EventChannel>));
  }
};

export function addActivity(input: Omit<ActivityEvent, 'id' | 'createdAt'>): ActivityEvent {
  const item: ActivityEvent = {
    id: makeId('act'),
    createdAt: nowIso(),
    ...input
  };
  db.activities.unshift(item);
  db.activities = db.activities.slice(0, 200);
  eventBus.emit('activity', item);
  return item;
}

export function createProject(input: Omit<Project, 'id'>) {
  const project: Project = { id: makeId('project'), ...input };
  db.projects.unshift(project);
  addActivity({ type: 'project', action: 'created', entityId: project.id, actorAgentId: input.ownerAgentId, summary: `Project created: ${project.name}` });
  return project;
}

export function updateProject(id: string, patch: Partial<Omit<Project, 'id'>>) {
  const project = db.projects.find((p) => p.id === id);
  if (!project) return null;
  Object.assign(project, patch);
  addActivity({ type: 'project', action: 'updated', entityId: id, actorAgentId: patch.ownerAgentId ?? project.ownerAgentId, summary: `Project updated: ${project.name}` });
  return project;
}

export function createTask(input: Omit<Task, 'id'>) {
  const task: Task = { id: makeId('task'), ...input };
  db.tasks.unshift(task);
  addActivity({ type: 'task', action: 'created', entityId: task.id, actorAgentId: task.agentId, summary: `Task created: ${task.title}` });
  return task;
}

export function updateTask(id: string, patch: Partial<Omit<Task, 'id'>>) {
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return null;
  Object.assign(task, patch);
  addActivity({ type: 'task', action: 'updated', entityId: id, actorAgentId: patch.agentId ?? task.agentId, summary: `Task updated: ${task.title}` });
  return task;
}

export function deleteTask(id: string) {
  const index = db.tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const [task] = db.tasks.splice(index, 1);
  addActivity({ type: 'task', action: 'deleted', entityId: id, actorAgentId: task.agentId, summary: `Task deleted: ${task.title}` });
  return task;
}

export function updateAgentStatus(id: string, status: AgentStatus) {
  const agent = db.agents.find((a) => a.id === id);
  if (!agent) return null;
  agent.status = status;
  addActivity({ type: 'agent', action: 'status_changed', entityId: id, actorAgentId: id, summary: `${agent.name} is now ${status}` });
  return agent;
}

export function createChatMessage(input: Omit<ChatMessage, 'id' | 'createdAt'>) {
  const msg: ChatMessage = { id: makeId('msg'), createdAt: nowIso(), ...input };
  db.chatMessages.push(msg);
  addActivity({ type: 'chat', action: 'posted', entityId: msg.id, actorAgentId: msg.authorAgentId, summary: `${msg.authorAgentId} posted in #${msg.topic}` });
  eventBus.emit('chat', msg);
  return msg;
}

export function createCollabThread(input: Omit<CollabThread, 'id' | 'createdAt'>) {
  const thread: CollabThread = { id: makeId('thread'), createdAt: nowIso(), ...input };
  db.collabThreads.push(thread);
  return thread;
}

export function createOutboxEvent(input: Omit<OutboxEvent, 'id' | 'createdAt'>) {
  const event: OutboxEvent = { id: makeId('evt'), createdAt: nowIso(), ...input };
  db.outboxEvents.push(event);
  return event;
}

export function createCollabMessage(input: Omit<CollabMessage, 'id' | 'createdAt'>) {
  const message: CollabMessage = { id: makeId('cmsg'), createdAt: nowIso(), ...input };
  db.collabMessages.push(message);

  const outboxPayload: CollabMessageCreatedEvent = {
    type: 'collab.message.created',
    id: message.id,
    threadId: message.threadId,
    projectId: message.projectId,
    actorAgentId: message.actorAgentId,
    body: message.body,
    mentions: message.mentions,
    createdAt: message.createdAt
  };

  createOutboxEvent({
    eventType: 'collab.message.created',
    aggregateId: message.threadId,
    payload: outboxPayload as unknown as Record<string, unknown>
  });

  addActivity({
    type: 'chat',
    action: 'collab_message_posted',
    entityId: message.id,
    actorAgentId: message.actorAgentId,
    summary: `${message.actorAgentId} posted in collab thread ${message.threadId}`
  });

  eventBus.emit('chat', outboxPayload);
  return message;
}

export function createDecision(input: Omit<Decision, 'id' | 'createdAt' | 'updatedAt'>) {
  const now = nowIso();
  const decision: Decision = {
    id: makeId('decision'),
    createdAt: now,
    updatedAt: now,
    ...input
  };

  db.decisions.unshift(decision);

  addActivity({
    type: 'system',
    action: 'decision_created',
    entityId: decision.id,
    actorAgentId: decision.createdByAgentId,
    summary: `Decision created: ${decision.title}`
  });

  createOutboxEvent({
    eventType: 'decision.created',
    aggregateId: decision.id,
    payload: {
      type: 'decision.created',
      id: decision.id,
      projectId: decision.projectId,
      title: decision.title,
      state: decision.state,
      createdByAgentId: decision.createdByAgentId,
      createdAt: decision.createdAt
    }
  });

  return decision;
}

export function transitionDecision(
  id: string,
  input: {
    toState: Decision['state'];
    actorAgentId: string;
    resolution?: string;
    decidedByAgentId?: string;
    supersededByDecisionId?: string;
  }
) {
  const decision = db.decisions.find((item) => item.id === id);
  if (!decision) return null;

  const fromState = decision.state;
  const transitionedAt = nowIso();

  decision.state = input.toState;
  decision.updatedAt = transitionedAt;
  decision.resolution = input.toState === 'decided' ? input.resolution : decision.resolution;
  decision.decidedByAgentId = input.toState === 'decided' ? input.decidedByAgentId : decision.decidedByAgentId;
  decision.supersededByDecisionId =
    input.toState === 'superseded' ? input.supersededByDecisionId ?? decision.supersededByDecisionId : undefined;

  const outboxPayload: DecisionTransitionEvent = {
    type: 'decision.transitioned',
    id: decision.id,
    projectId: decision.projectId,
    fromState,
    toState: decision.state,
    actorAgentId: input.actorAgentId,
    resolution: input.resolution,
    decidedByAgentId: input.decidedByAgentId,
    supersededByDecisionId: decision.supersededByDecisionId,
    transitionedAt
  };

  createOutboxEvent({
    eventType: 'decision.transitioned',
    aggregateId: decision.id,
    payload: outboxPayload as unknown as Record<string, unknown>
  });

  addActivity({
    type: 'system',
    action: 'decision_transitioned',
    entityId: decision.id,
    actorAgentId: input.actorAgentId,
    summary: `Decision transitioned ${fromState} -> ${decision.state}`
  });

  return {
    decision,
    fromState,
    transitionedAt
  };
}

export function createWorkItemDependency(input: Omit<WorkItemDependency, 'id' | 'createdAt'>) {
  const dependency: WorkItemDependency = {
    id: makeId('dep'),
    createdAt: nowIso(),
    ...input
  };

  db.workItemDependencies.push(dependency);

  addActivity({
    type: 'task',
    action: 'dependency_created',
    entityId: dependency.id,
    summary: `Dependency linked: ${dependency.workItemId} -> ${dependency.dependsOnWorkItemId}`
  });

  return dependency;
}

export function dependencyExists(workItemId: string, dependsOnWorkItemId: string, dependencyType?: DependencyType) {
  return db.workItemDependencies.some(
    (edge) =>
      edge.workItemId === workItemId &&
      edge.dependsOnWorkItemId === dependsOnWorkItemId &&
      (dependencyType ? edge.dependencyType === dependencyType : true)
  );
}

export function hasDependencyPath(fromWorkItemId: string, toWorkItemId: string) {
  if (fromWorkItemId === toWorkItemId) return true;

  const visited = new Set<string>();
  const stack = [fromWorkItemId];

  while (stack.length) {
    const current = stack.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const nextNodes = db.workItemDependencies
      .filter((edge) => edge.workItemId === current)
      .map((edge) => edge.dependsOnWorkItemId);

    for (const next of nextNodes) {
      if (next === toWorkItemId) return true;
      if (!visited.has(next)) stack.push(next);
    }
  }

  return false;
}

export function getUnresolvedHardDependencies(workItemId: string) {
  const hardDependencyIds = db.workItemDependencies
    .filter((edge) => edge.workItemId === workItemId && edge.dependencyType === 'hard')
    .map((edge) => edge.dependsOnWorkItemId);

  return hardDependencyIds
    .map((id) => db.tasks.find((task) => task.id === id))
    .filter((task): task is Task => {
      if (!task) return false;
      return task.status !== 'done';
    });
}

export function getTaskStatusBreakdown(filteredTasks: Task[]) {
  return filteredTasks.reduce<Record<TaskStatus, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    { todo: 0, in_progress: 0, blocked: 0, done: 0 }
  );
}
