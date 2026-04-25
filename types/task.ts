export type TaskStatus = 'todo' | 'doing' | 'done';

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
  createdAt: string;
  updatedAt: string;
}

export interface TaskNode extends Task {
  children: TaskNode[];
}
