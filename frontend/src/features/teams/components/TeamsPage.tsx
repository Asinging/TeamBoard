import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTeams, useCreateTeam, useDeleteTeam } from '../hooks/useTeams';
import { useLogout } from '../../auth/hooks/useAuth';
import { notifySuccess, notifyError, confirmDanger } from '../../../lib/swal';
import { Avatar, AvatarGroup } from '../../../components/ui/Avatar';

const TEAM_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

function teamColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return TEAM_COLORS[Math.abs(h) % TEAM_COLORS.length];
}

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const logout = useLogout();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const errMsg = (err: unknown) =>
    (err as any)?.response?.data?.message ?? 'Something went wrong';

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createTeam.mutate({ name, description }, {
      onSuccess: () => { notifySuccess('Team created'); setName(''); setDescription(''); setShowForm(false); },
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const handleDelete = async (id: string, teamName: string) => {
    const result = await confirmDanger(`Delete "${teamName}"?`, 'This cannot be undone.');
    if (!result.isConfirmed) return;
    deleteTeam.mutate(id, {
      onSuccess: () => notifySuccess('Team deleted'),
      onError: (err) => notifyError(errMsg(err)),
    });
  };

  const totalMembers = teams?.reduce(
    (sum, t) => sum + (Array.isArray(t.members) ? t.members.length : 0), 0
  ) ?? 0;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="top-nav">
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/projects">Projects</Link>
            <span className="nav-active">Teams</span>
          </nav>
          <h1>Teams</h1>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Team'}
          </button>
          <button className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </header>

      {/* Stats strip */}
      {!isLoading && (teams?.length ?? 0) > 0 && (
        <div className="teams-stats-strip">
          <div className="teams-stat">
            <span className="teams-stat-value">{teams!.length}</span>
            <span className="teams-stat-label">{teams!.length === 1 ? 'Team' : 'Teams'}</span>
          </div>
          <div className="teams-stat-divider" />
          <div className="teams-stat">
            <span className="teams-stat-value">{totalMembers}</span>
            <span className="teams-stat-label">Total members</span>
          </div>
        </div>
      )}

      {showForm && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input type="text" placeholder="Team name  e.g. Design Squad" value={name}
            onChange={(e) => setName(e.target.value)} required minLength={2} />
          <input type="text" placeholder="Description (optional)" value={description}
            onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={createTeam.isPending}>
            {createTeam.isPending ? 'Creating…' : 'Create Team'}
          </button>
        </form>
      )}

      {isLoading && <p>Loading teams…</p>}

      {!isLoading && teams?.length === 0 && (
        <div className="fancy-empty">
          <span className="fancy-empty-icon">👥</span>
          <p className="fancy-empty-title">No teams yet</p>
          <p className="fancy-empty-sub">Create your first team to collaborate with others.</p>
          <button onClick={() => setShowForm(true)}>+ New Team</button>
        </div>
      )}

      <div className="fancy-team-grid">
        {teams?.map((team) => {
          const color = teamColor(team.name);
          const initial = team.name.trim()[0]?.toUpperCase() ?? '?';
          const memberCount = Array.isArray(team.members) ? team.members.length : 0;
          return (
            <div key={team._id} className="fancy-team-card">
              {/* Card top accent stripe matching team color */}
              <div className="ftc-accent" style={{ background: color }} />

              <div className="ftc-body">
                {/* Header: circle + name + desc */}
                <div className="ftc-header">
                  <div className="ftc-circle" style={{ background: color }}>
                    {initial}
                  </div>
                  <div className="ftc-info">
                    <Link to={`/teams/${team._id}`} className="ftc-name">{team.name}</Link>
                    {team.description && <p className="ftc-desc">{team.description}</p>}
                  </div>
                </div>

                {/* Member avatars */}
                <div className="ftc-members">
                  <AvatarGroup members={team.members} max={5} size={30} />
                  <span className="ftc-member-count">
                    {memberCount} member{memberCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Footer: owner + delete */}
                <div className="ftc-footer">
                  <div className="ftc-owner">
                    <Avatar name={team.owner.name} size={24} />
                    <span className="ftc-owner-name">{team.owner.name}</span>
                    <span className="badge badge-active" style={{ fontSize: 10, padding: '1px 6px' }}>owner</span>
                  </div>
                  <button className="btn-danger-sm" onClick={() => handleDelete(team._id, team.name)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
