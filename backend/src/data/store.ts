import { agents as seedAgents, projects as seedProjects, tasks as seedTasks } from './seed';
import type { ActivityEvent, Agent, AgentStatus, ChatMessage, EventChannel, EventPayload, Project, Task, TaskStatus } from '../types';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const db: {
  agents: Agent[];
  projects: Project[];
  tasks: Task[];
  chatMessages: ChatMessage[];
  activities: ActivityEvent[];
} = {
  agents: clone(seedAgents),
  projects: clone(seedProjects),
  tasks: clone(seedTasks),
  chatMessages: [
    { id: makeId('msg'), topic: 'general', authorAgentId: 'agent-jarvis', content: 'Mission Control channel live.', createdAt: nowIso() }
  ],
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

export function getTaskStatusBreakdown(filteredTasks: Task[]) {
  return filteredTasks.reduce<Record<TaskStatus, number>>(
    (acc, task) => {
      acc[task.status] = (acc[task.status] ?? 0) + 1;
      return acc;
    },
    { todo: 0, in_progress: 0, blocked: 0, done: 0 }
  );
}
