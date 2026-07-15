import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTeam, useUpdateTeam, useAddTeamMember, useRemoveTeamMember } from '../hooks/useTeams';
import { useProjects, useCreateProject } from '../../projects/hooks/useProjects';
import { notifySuccess, notifyError, confirmDanger } from '../../../lib/swal';
import { Avatar } from '../../../components/ui/Avatar';

const TEAM_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];
function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}

export default function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: team, isLoading } = useTeam(teamId!);
  const updateTeam = useUpdateTeam(teamId!);
  const addMember = useAddTeamMember(teamId!);
  const removeMember = useRemoveTeamMember(teamId!);
  const { data: allProjects } = useProjects();
  const createProject = useCreateProject();

  const [editingName, setEditingName] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const teamProjects = allProjects?.filter((p) => p.team?._id === teamId) ?? [];
  const errMsg = (err: unknown) =>
    (err as any)?.response?.data?.message ?? 'Something went wrong';

  const startEditName = () => { setTeamName(team?.name ?? ''); setEditingName(true); };

  const handleRename = (e: React.FormEvent) => {
    e.preventDefault();
    updateTeam.mutate({ name: teamName }, {
      onSuccess: () => { notifySuccess('Team renamed'); setEditingName(false); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    addMember.mutate(memberEmail, {
      onSuccess: () => { notifySuccess('Member added'); setMemberEmail(''); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const result = await confirmDanger(`Remove ${memberName}?`, 'They will lose access to this team.');
    if (!result.isConfirmed) return;
    removeMember.mutate(memberId, {
      onSuccess: () => notifySuccess('Member removed'),
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProject.mutate({ name: projectName, description: projectDesc, teamId }, {
      onSuccess: () => {
        notifySuccess('Project created');
        setProjectName(''); setProjectDesc(''); setShowProjectForm(false);
      },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  if (isLoading) return <div className="page"><p>Loading…</p></div>;
  if (!team) return <div className="page"><p>Team not found.</p></div>;

  const color = teamColor(team.name);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="top-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/projects">Projects</Link>
            <Link to="/teams">Teams</Link>
          </nav>

          {editingName ? (
            <form className="inline-rename" onSubmit={handleRename}>
              <input autoFocus value={teamName} onChange={(e) => setTeamName(e.target.value)} required minLength={2} />
              <button type="submit" disabled={updateTeam.isPending}>Save</button>
              <button type="button" className="btn-ghost" onClick={() => setEditingName(false)}>Cancel</button>
            </form>
          ) : (
            <div className="title-row">
              <div className="team-detail-initial" style={{ background: color }}>
                {team.name.trim()[0]?.toUpperCase()}
              </div>
              <h1>{team.name}</h1>
              <button className="btn-ghost btn-sm" onClick={startEditName}>Rename</button>
            </div>
          )}
          {team.description && <p className="subtitle">{team.description}</p>}
        </div>

        <button onClick={() => setShowProjectForm((v) => !v)}>
          {showProjectForm ? 'Cancel' : '+ New Project'}
        </button>
      </header>

      {/* Team stats strip */}
      <div className="team-detail-stats">
        <div className="team-detail-stat">
          <span className="team-detail-stat-num">{team.members.length}</span>
          <span className="team-detail-stat-label">Members</span>
        </div>
        <div className="teams-stat-divider" />
        <div className="team-detail-stat">
          <span className="team-detail-stat-num">{teamProjects.length}</span>
          <span className="team-detail-stat-label">Projects</span>
        </div>
        <div className="teams-stat-divider" />
        <div className="team-detail-stat">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar name={team.owner.name} size={22} />
            <span className="team-detail-stat-label">{team.owner.name}</span>
            <span className="badge badge-active" style={{ fontSize: 10 }}>owner</span>
          </div>
        </div>
      </div>

      {showProjectForm && (
        <form className="inline-form" onSubmit={handleCreateProject}>
          <input type="text" placeholder="Project name" value={projectName}
            onChange={(e) => setProjectName(e.target.value)} required minLength={2} />
          <input type="text" placeholder="Description (optional)" value={projectDesc}
            onChange={(e) => setProjectDesc(e.target.value)} />
          <button type="submit" disabled={createProject.isPending}>
            {createProject.isPending ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      <div className="team-layout">
        {/* Members column */}
        <div className="team-members-col">
          <h2 className="section-title">Members ({team.members.length})</h2>

          <ul className="member-list">
            {team.members.map((m) => {
              const isOwner = m._id === team.owner._id;
              return (
                <li key={m._id} className="member-item member-item-rich">
                  <div className="member-item-left">
                    <Avatar name={m.name} size={36} />
                    <div>
                      <span className="member-name">{m.name}</span>
                      <span className="member-email">{m.email}</span>
                    </div>
                    {isOwner && (
                      <span className="badge badge-active" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                        owner
                      </span>
                    )}
                  </div>
                  {!isOwner && (
                    <button className="btn-danger-sm" onClick={() => handleRemoveMember(m._id, m.name)}>
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <form className="inline-form" style={{ marginTop: 12 }} onSubmit={handleAddMember}>
            <input type="email" placeholder="Invite by email" value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)} required />
            <button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? 'Adding…' : 'Add'}
            </button>
          </form>
        </div>

        {/* Projects column */}
        <div className="team-projects-col">
          <h2 className="section-title">Projects ({teamProjects.length})</h2>

          {teamProjects.length === 0 && (
            <p className="empty-state" style={{ padding: '32px 0' }}>
              No projects yet. Create one above.
            </p>
          )}

          <div className="fancy-project-grid" style={{ gap: 12 }}>
            {teamProjects.map((project) => (
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
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                  </div>
                  <div className="fpc-footer" style={{ paddingTop: 10, marginTop: 4 }}>
                    <span className="fpc-member-label">
                      {project.members.length} member{project.members.length !== 1 ? 's' : ''}
                    </span>
                    <Link to={`/projects/${project._id}`} className="btn-ghost"
                      style={{ padding: '3px 10px', fontSize: 12, display: 'inline-block' }}>
                      Open →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
