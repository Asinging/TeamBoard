import { Link } from 'react-router-dom';
import { useMe, useLogout } from '../../auth/hooks/useAuth';
import { useProjects } from '../../projects/hooks/useProjects';
import { useTeams } from '../../teams/hooks/useTeams';
import { useStats } from '../hooks/useStats';

interface StatCardProps {
  label: string;
  value: number | string;
  color: string;
  bgColor: string;
  icon: string;
  sub?: string;
}

function StatCard({ label, value, color, bgColor, icon, sub }: StatCardProps) {
  return (
    <div className="stat-card" style={{ '--card-color': color } as React.CSSProperties}>
      <div className="stat-icon" style={{ background: bgColor }}>
        <span style={{ color, fontSize: 22 }}>{icon}</span>
      </div>
      <div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user } = useMe();
  const { data: projects } = useProjects();
  const { data: teams } = useTeams();
  const { data: stats, isLoading } = useStats();
  const logout = useLogout();

  const todo = stats?.tasks.todo ?? 0;
  const inProg = stats?.tasks.in_progress ?? 0;
  const done = stats?.tasks.done ?? 0;
  const total = todo + inProg + done;
  const openTasks = todo + inProg;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');
  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="top-nav">
            <span className="nav-active">Dashboard</span>
            <Link to="/projects">Projects</Link>
            <Link to="/teams">Teams</Link>
          </nav>
          <h1>Dashboard</h1>
        </div>
        <button className="btn-ghost" onClick={logout}>Sign out</button>
      </header>

      {/* Hero greeting */}
      <div className="dash-hero">
        <p className="dash-greeting">{greeting},</p>
        <h2 className="dash-name">{user?.name ?? '…'}</h2>
        <p className="dash-sub">Here's what's happening across your workspace.</p>
        <div className="dash-hero-actions">
          <Link to="/projects">
            <button className="btn-hero">+ New Project</button>
          </Link>
          <Link to="/teams">
            <button className="btn-hero-ghost">+ New Team</button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <StatCard
          label="Projects"
          value={isLoading ? '…' : (stats?.projects ?? 0)}
          color="#4f46e5"
          bgColor="#ede9fe"
          icon="📁"
          sub={`${projects?.filter(p => p.status === 'active').length ?? 0} active`}
        />
        <StatCard
          label="Teams"
          value={isLoading ? '…' : (stats?.teams ?? 0)}
          color="#0ea5e9"
          bgColor="#e0f2fe"
          icon="👥"
          sub={`${teams?.reduce((a, t) => a + (Array.isArray(t.members) ? t.members.length : 0), 0) ?? 0} total members`}
        />
        <StatCard
          label="Open Tasks"
          value={isLoading ? '…' : openTasks}
          color="#f59e0b"
          bgColor="#fef3c7"
          icon="📋"
          sub={`${todo} to do · ${inProg} in progress`}
        />
        <StatCard
          label="Completed"
          value={isLoading ? '…' : `${completionPct}%`}
          color="#10b981"
          bgColor="#d1fae5"
          icon="✅"
          sub={`${done} of ${total} tasks done`}
        />
      </div>

      {/* Two-column content */}
      <div className="dash-grid">

        {/* Recent Projects */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-section-title">Recent Projects</h3>
            <Link to="/projects" className="dash-see-all">View all →</Link>
          </div>

          {!projects?.length && (
            <p className="column-empty" style={{ padding: '32px 0' }}>
              No projects yet.{' '}
              <Link to="/projects">Create your first project</Link>
            </p>
          )}

          <ul className="dash-project-list">
            {projects?.slice(0, 6).map((p) => (
              <li key={p._id} className="dash-project-item">
                <div className="dash-project-info">
                  <Link to={`/projects/${p._id}`} className="dash-project-name">
                    {p.name}
                  </Link>
                  {p.description && (
                    <span className="dash-project-desc">{p.description}</span>
                  )}
                </div>
                <div className="dash-project-meta">
                  {p.team && (
                    <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6' }}>
                      {p.team.name}
                    </span>
                  )}
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  <span className="dash-member-count">
                    {p.members.length}
                    {p.members.length === 1 ? ' member' : ' members'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Task Overview */}
        <div className="dash-card">
          <div className="dash-card-header">
            <h3 className="dash-section-title">Task Overview</h3>
          </div>

          <div className="dash-total-tasks">
            <span className="dash-total-num">{total}</span>
            <span className="dash-total-label">total tasks</span>
          </div>

          <div className="task-bars">
            <div className="task-bar-wrap">
              <div className="task-bar-label">
                <span>To Do</span>
                <span className="task-bar-count">{todo}</span>
              </div>
              <div className="task-bar-track">
                <div className="task-bar-fill bar-todo" style={{ width: pct(todo) }} />
              </div>
            </div>

            <div className="task-bar-wrap">
              <div className="task-bar-label">
                <span>In Progress</span>
                <span className="task-bar-count">{inProg}</span>
              </div>
              <div className="task-bar-track">
                <div className="task-bar-fill bar-in-progress" style={{ width: pct(inProg) }} />
              </div>
            </div>

            <div className="task-bar-wrap">
              <div className="task-bar-label">
                <span>Done</span>
                <span className="task-bar-count">{done}</span>
              </div>
              <div className="task-bar-track">
                <div className="task-bar-fill bar-done" style={{ width: pct(done) }} />
              </div>
            </div>
          </div>

          {/* Donut chart */}
          <div className="donut-wrap">
            <div className="donut-chart">
              <svg viewBox="0 0 36 36" className="donut-svg">
                <circle className="donut-track" cx="18" cy="18" r="15.9" />
                <circle
                  className="donut-fill"
                  cx="18" cy="18" r="15.9"
                  strokeDasharray={`${completionPct} ${100 - completionPct}`}
                  strokeDashoffset="25"
                />
              </svg>
              <div className="donut-center">
                <span className="donut-pct">{completionPct}%</span>
              </div>
            </div>
            <div className="donut-legend">
              <div className="legend-item"><span className="legend-dot dot-todo" />To Do</div>
              <div className="legend-item"><span className="legend-dot dot-in-progress" />In Progress</div>
              <div className="legend-item"><span className="legend-dot dot-done" />Done</div>
            </div>
          </div>

          {/* Teams */}
          {(teams?.length ?? 0) > 0 && (
            <div className="dash-teams-section">
              <p className="dash-teams-label">Your Teams</p>
              <div className="dash-teams-list">
                {teams!.map((t) => (
                  <Link key={t._id} to={`/teams/${t._id}`} style={{ textDecoration: 'none' }}>
                    <span className="team-chip">
                      {t.name}
                      <span className="team-chip-count">
                        {Array.isArray(t.members) ? t.members.length : 0}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
