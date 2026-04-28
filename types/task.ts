export type TaskStatus = 'todo' | 'doing' | 'done';
export type DeliverableType = 'doc' | 'design' | 'code' | 'spec' | 'data' | 'other';
export type DeliverableStatus = 'pending' | 'in-progress' | 'done';

export interface Deliverable {
  id: string;
  taskId: string;
  name: string;
  type: DeliverableType;
  status: DeliverableStatus;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string | null;
  assignee: string | null;
  status: TaskStatus;
  progress: number;
  startDate: string | null;
  dueDate: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  deliverables?: Deliverable[];
}

export interface TaskNode extends Task {
  children: TaskNode[];
}
