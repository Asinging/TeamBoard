import type { CSSProperties } from 'react';
import type { User } from '../../types';

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function colorFor(name: string): string {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

function initials(name: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

interface AvatarProps {
  name: string;
  size?: number;
  style?: CSSProperties;
}

export function Avatar({ name, size = 32, style }: AvatarProps) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colorFor(name),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.38),
        fontWeight: 700,
        flexShrink: 0,
        border: '2px solid #fff',
        userSelect: 'none',
        ...style,
      }}
    >
      {initials(name)}
    </div>
  );
}

interface AvatarGroupProps {
  members: Pick<User, '_id' | 'name'>[];
  max?: number;
  size?: number;
}

export function AvatarGroup({ members, max = 4, size = 28 }: AvatarGroupProps) {
  const valid = members.filter((m) => m && m.name);
  const shown = valid.slice(0, max);
  const extra = valid.length - max;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <Avatar
          key={m._id}
          name={m.name}
          size={size}
          style={{ marginLeft: i > 0 ? -8 : 0, zIndex: shown.length - i }}
        />
      ))}
      {extra > 0 && (
        <div
          className="avatar-extra"
          style={{ width: size, height: size, fontSize: Math.round(size * 0.35), marginLeft: -8, zIndex: 0 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
