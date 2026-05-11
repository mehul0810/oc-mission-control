import type { Agent, Project, Task } from '../types';

export const agents: Agent[] = [
  { id: 'agent-jarvis', name: 'Jarvis', role: 'COO', status: 'active' },
  { id: 'agent-tony', name: 'Tony Stark', role: 'Tech Lead', status: 'active' },
  { id: 'agent-peter', name: 'Peter Parker', role: 'Plugin Developer', status: 'active' },
  { id: 'agent-shuri', name: 'Shuri', role: 'Block Theme Developer', status: 'idle' },
  { id: 'agent-vision', name: 'Vision', role: 'QA Engineer', status: 'active' },
  { id: 'agent-mehul', name: 'Mehul', role: 'Founder', status: 'active' }
];

export const projects: Project[] = [
  { id: 'project-mc', name: 'Mission Control', slug: 'mission-control', status: 'active', ownerAgentId: 'agent-jarvis' },
  { id: 'project-oc', name: 'OneCaptcha', slug: 'onecaptcha', status: 'active', ownerAgentId: 'agent-peter' },
  { id: 'project-tr', name: 'ThemeRouter', slug: 'themerouter', status: 'planning', ownerAgentId: 'agent-shuri' }
];

export const tasks: Task[] = [
  { id: 'task-1', title: 'Define API schema', projectId: 'project-mc', agentId: 'agent-tony', status: 'done', priority: 'high' },
  { id: 'task-2', title: 'Implement backend foundation', projectId: 'project-mc', agentId: 'agent-peter', status: 'in_progress', priority: 'critical' },
  { id: 'task-3', title: 'Build dashboard widgets', projectId: 'project-mc', agentId: 'agent-shuri', status: 'todo', priority: 'high' },
  { id: 'task-4', title: 'Regression plan', projectId: 'project-mc', agentId: 'agent-vision', status: 'todo', priority: 'medium' },
  { id: 'task-5', title: 'Demo walkthrough script', projectId: 'project-mc', agentId: 'agent-jarvis', status: 'in_progress', priority: 'medium' },
  { id: 'task-6', title: 'Release checklist baseline', projectId: 'project-mc', agentId: 'agent-vision', status: 'blocked', priority: 'high', dueDate: '2026-05-15', blocker: 'Pending final scope lock' },

  { id: 'task-7', title: 'Captcha UX improvements', projectId: 'project-oc', agentId: 'agent-peter', status: 'blocked', priority: 'high', dueDate: '2026-05-17', blocker: 'Needs revised UX copy' },
  { id: 'task-8', title: 'Spam defense rule tuning', projectId: 'project-oc', agentId: 'agent-tony', status: 'in_progress', priority: 'high' },
  { id: 'task-9', title: 'Plugin settings IA cleanup', projectId: 'project-oc', agentId: 'agent-shuri', status: 'todo', priority: 'medium' },
  { id: 'task-10', title: 'E2E captcha validation suite', projectId: 'project-oc', agentId: 'agent-vision', status: 'todo', priority: 'high' },
  { id: 'task-11', title: 'Pricing page conversion fixes', projectId: 'project-oc', agentId: 'agent-mehul', status: 'done', priority: 'medium' },
  { id: 'task-12', title: 'Telemetry dashboard events', projectId: 'project-oc', agentId: 'agent-jarvis', status: 'in_progress', priority: 'medium' },

  { id: 'task-13', title: 'Theme routing prototype', projectId: 'project-tr', agentId: 'agent-shuri', status: 'in_progress', priority: 'high' },
  { id: 'task-14', title: 'Template resolver architecture', projectId: 'project-tr', agentId: 'agent-tony', status: 'todo', priority: 'high' },
  { id: 'task-15', title: 'Pattern library audit', projectId: 'project-tr', agentId: 'agent-shuri', status: 'todo', priority: 'medium' },
  { id: 'task-16', title: 'ThemeRouter regression matrix', projectId: 'project-tr', agentId: 'agent-vision', status: 'blocked', priority: 'medium', dueDate: '2026-05-19', blocker: 'Awaiting stable beta routes' },
  { id: 'task-17', title: 'Beta partner onboarding list', projectId: 'project-tr', agentId: 'agent-mehul', status: 'done', priority: 'medium' },
  { id: 'task-18', title: 'Roadmap alignment deck', projectId: 'project-tr', agentId: 'agent-jarvis', status: 'in_progress', priority: 'low' }
];
