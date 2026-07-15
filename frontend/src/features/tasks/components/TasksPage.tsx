import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProject, useAddMember, useRemoveMember } from '../../projects/hooks/useProjects';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { notifySuccess, notifyError, confirmDanger } from '../../../lib/swal';
import type { Task, TaskPriority, TaskStatus } from '../../../types';

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

interface EditState {
  title: string;
  description: string;
  priority: TaskPriority;
}

export default function TasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId!);
  const { data: tasks, isLoading } = useTasks(projectId!);
  const createTask = useCreateTask(projectId!);
  const updateTask = useUpdateTask(projectId!);
  const deleteTask = useDeleteTask(projectId!);
  const addMember = useAddMember(projectId!);
  const removeMember = useRemoveMember(projectId!);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ title: '', description: '', priority: 'medium' });

  const [showMembers, setShowMembers] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  const errMsg = (err: unknown) =>
    (err as any)?.response?.data?.message ?? 'Something went wrong';

  const startEdit = (task: Task) => {
    setEditingId(task._id);
    setEditState({ title: task.title, description: task.description, priority: task.priority });
  };

  const cancelEdit = () => setEditingId(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTask.mutate(
      { title, description, priority },
      {
        onSuccess: () => {
          notifySuccess('Task created');
          setTitle(''); setDescription(''); setPriority('medium'); setShowForm(false);
        },
        onError: (err) => notifyError(errMsg(err)),
      },
    );
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateTask.mutate(
      { id: editingId, ...editState },
      {
        onSuccess: () => { notifySuccess('Task updated'); cancelEdit(); },
        onError: (err) => notifyError(errMsg(err)),
      },
    );
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember.mutate(memberEmail, {
      onSuccess: () => { notifySuccess('Member added to project'); setMemberEmail(''); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const result = await confirmDanger(`Remove ${memberName}?`, 'They will lose access to this project.');
    if (!result.isConfirmed) return;
    removeMember.mutate(memberId, {
      onSuccess: () => notifySuccess('Member removed'),
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    const result = await confirmDanger(`Delete "${taskTitle}"?`);
    if (!result.isConfirmed) return;
    deleteTask.mutate(taskId, {
      onSuccess: () => notifySuccess('Task deleted'),
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const tasksByStatus = (status: TaskStatus) =>
    tasks?.filter((t) => t.status === status) ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Link to="/projects" className="back-link">← Projects</Link>
          <h1>{project?.name ?? 'Loading…'}</h1>
          {project?.description && <p className="subtitle">{project.description}</p>}
        </div>
        <div className="header-actions">
          <button className="btn-ghost" onClick={() => setShowMembers((v) => !v)}>
            Team ({project?.members.length ?? 0})
          </button>
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>
      </header>

      {showMembers && (
        <div className="members-panel">
          <h3>Project Members</h3>
          <ul className="member-list">
            {project?.members.map((m) => {
              const isOwner = m._id === project.owner._id;
              return (
                <li key={m._id} className="member-item">
                  <span>
                    {m.name} <em>{m.email}</em>
                    {isOwner && <span className="badge badge-active" style={{ marginLeft: 6 }}>owner</span>}
                  </span>
                  {!isOwner && (
                    <button className="btn-danger-sm" onClick={() => handleRemoveMember(m._id, m.name)}>
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <form className="inline-form" onSubmit={handleAddMember}>
            <input type="email" placeholder="Invite by email" value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)} required />
            <button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>
      )}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input type="text" placeholder="Task title" value={title}
            onChange={(e) => setTitle(e.target.value)} required minLength={2} />
          <input type="text" placeholder="Description (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)} />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <button type="submit" disabled={createTask.isPending}>
            {createTask.isPending ? 'Adding…' : 'Add Task'}
          </button>
        </form>
      )}

      {isLoading && <p>Loading tasks…</p>}

      <div className="board">
        {STATUS_COLUMNS.map(({ key, label }) => (
          <div key={key} className="board-column">
            <h3 className="column-header">
              {label}
              <span className="count">{tasksByStatus(key).length}</span>
            </h3>

            {tasksByStatus(key).map((task) =>
              editingId === task._id ? (
                <form key={task._id} className="task-edit-form" onSubmit={handleEdit}>
                  <input type="text" value={editState.title}
                    onChange={(e) => setEditState((s) => ({ ...s, title: e.target.value }))}
                    required minLength={2} />
                  <input type="text" placeholder="Description" value={editState.description}
                    onChange={(e) => setEditState((s) => ({ ...s, description: e.target.value }))} />
                  <select value={editState.priority}
                    onChange={(e) => setEditState((s) => ({ ...s, priority: e.target.value as TaskPriority }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <div className="edit-actions">
                    <button type="submit" disabled={updateTask.isPending}>
                      {updateTask.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              ) : (
                <div key={task._id} className={`task-card priority-${task.priority}`}>
                  <p className="task-title">{task.title}</p>
                  {task.description && <p className="task-desc">{task.description}</p>}
                  <div className="task-meta">
                    <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    {task.assignee && <span className="assignee">{task.assignee.name}</span>}
                  </div>
                  <div className="task-actions">
                    <select value={task.status}
                      onChange={(e) =>
                        updateTask.mutate(
                          { id: task._id, status: e.target.value as TaskStatus },
                          { onError: (err) => notifyError(errMsg(err)) },
                        )
                      }>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    <button className="btn-ghost" style={{ padding: '3px 8px', fontSize: '12px' }}
                      onClick={() => startEdit(task)}>Edit</button>
                    <button className="btn-danger-sm" onClick={() => handleDeleteTask(task._id, task.title)}>×</button>
                  </div>
                </div>
              )
            )}

            {tasksByStatus(key).length === 0 && (
              <p className="column-empty">No tasks here</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
