import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../hooks/useProjects';
import { useLogout } from '../../auth/hooks/useAuth';
import { notifySuccess, notifyError, confirmDanger } from '../../../lib/swal';
import { AvatarGroup } from '../../../components/ui/Avatar';
import type { Project } from '../../../types';

type Filter = 'all' | 'active' | 'archived';

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const logout = useLogout();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const updateProject = useUpdateProject(editingId ?? '');

  const errMsg = (err: unknown) =>
    (err as any)?.response?.data?.message ?? 'Something went wrong';

  const startEdit = (p: Project) => { setEditingId(p._id); setEditName(p.name); setEditDesc(p.description); };
  const cancelEdit = () => setEditingId(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({ name, description }, {
      onSuccess: () => { notifySuccess('Project created'); setName(''); setDescription(''); setShowForm(false); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProject.mutate({ name: editName, description: editDesc }, {
      onSuccess: () => { notifySuccess('Project updated'); cancelEdit(); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleDelete = async (id: string, projectName: string) => {
    const result = await confirmDanger(`Delete "${projectName}"?`, 'All tasks in this project will be lost.');
    if (!result.isConfirmed) return;
    deleteProject.mutate(id, {
      onSuccess: () => notifySuccess('Project deleted'),
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const total = projects?.length ?? 0;
  const activeCount = projects?.filter((p) => p.status === 'active').length ?? 0;
  const archivedCount = total - activeCount;
  const filtered = filter === 'all' ? projects : projects?.filter((p) => p.status === filter);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="top-nav">
            <Link to="/dashboard">Dashboard</Link>
            <span className="nav-active">Projects</span>
            <Link to="/teams">Teams</Link>
          </nav>
          <h1>My Projects</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
          <button className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input type="text" placeholder="Project name" value={name}
            onChange={(e) => setName(e.target.value)} required minLength={2} />
          <input type="text" placeholder="Description (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={createProject.isPending}>
            {createProject.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {/* Filter tabs */}
      {!isLoading && total > 0 && (
        <div className="filter-strip">
          {(['all', 'active', 'archived'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-tab${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Archived'}
              <span className="filter-count">
                {f === 'all' ? total : f === 'active' ? activeCount : archivedCount}
              </span>
            </button>
          ))}
        </div>
      )}

      {isLoading && <p>Loading projects…</p>}

      {!isLoading && total === 0 && (
        <div className="fancy-empty">
          <span className="fancy-empty-icon">📁</span>
          <p className="fancy-empty-title">No projects yet</p>
          <p className="fancy-empty-sub">Create your first project to get started.</p>
          <button onClick={() => setShowForm(true)}>+ New Project</button>
        </div>
      )}

      <div className="fancy-project-grid">
        {filtered?.map((project) =>
          editingId === project._id ? (
            <form key={project._id} className="task-edit-form fancy-edit-card" onSubmit={handleEdit}>
              <input autoFocus type="text" value={editName}
                onChange={(e) => setEditName(e.target.value)} required minLength={2} />
              <input type="text" placeholder="Description" value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)} />
              <div className="edit-actions">
                <button type="submit" disabled={updateProject.isPending}>
                  {updateProject.isPending ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          ) : (
            <div key={project._id} className={`fancy-project-card status-${project.status}`}>
              <div className="fpc-accent" />
              <div className="fpc-body">
                <div className="fpc-top">
                  <div className="fpc-title-area">
                    <Link to={`/projects/${project._id}`} className="fpc-title">
                      {project.name}
                    </Link>
                    {project.description && (
                      <p className="fpc-desc">{project.description}</p>
                    )}
                  </div>
                  <div className="fpc-badges">
                    {project.team && (
                      <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                        {project.team.name}
                      </span>
                    )}
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                  </div>
                </div>

                <div className="fpc-footer">
                  <div className="fpc-members">
                    <AvatarGroup members={project.members} max={4} size={28} />
                    {project.members.length > 0 && (
                      <span className="fpc-member-label">
                        {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: '12px' }}
                      onClick={() => startEdit(project)}>Edit</button>
                    <button className="btn-danger-sm"
                      onClick={() => handleDelete(project._id, project.name)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
