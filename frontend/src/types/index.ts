// _id is the consistent key across all API responses (Mongoose populated docs + auth response)
export interface User {
  _id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  owner: User;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  _id: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  owner: User;
  members: User[];
  team: Pick<Team, '_id' | 'name'> | null;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: string;
  assignee: User | null;
  createdBy: User;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}
