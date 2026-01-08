'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ALL_PLAYERS, TEAMS } from '@/lib/data';
import { Player, PlayerProfile } from '@/lib/types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleDisplay(role?: string): { icon: string; label: string; color: string } | null {
  switch (role) {
    case 'Batsman':
      return { icon: '🏏', label: 'Batsman', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    case 'Bowler':
      return { icon: '🎯', label: 'Bowler', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    case 'All-rounder':
      return { icon: '⚡', label: 'All-rounder', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
    case 'WK-Batsman':
      return { icon: '🧤', label: 'WK-Batsman', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
    default:
      return null;
  }
}

function getCategoryBadge(category: string): { label: string; color: string } {
  switch (category) {
    case 'CAPTAIN':
      return { label: 'Captain', color: 'bg-amber-500/30 text-amber-300 border-amber-500/50' };
    case 'VICE_CAPTAIN':
      return { label: 'Vice Captain', color: 'bg-amber-500/20 text-amber-200 border-amber-500/30' };
    case 'APLUS':
      return { label: 'A+ Player', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
    case 'BASE':
      return { label: 'Base', color: 'bg-white/10 text-white/60 border-white/20' };
    default:
      return { label: category, color: 'bg-white/10 text-white/60 border-white/20' };
  }
}

function PlayerCard({ player, profile }: { player: Player; profile?: PlayerProfile }) {
  const roleDisplay = getRoleDisplay(player.role);
  const categoryBadge = getCategoryBadge(player.category);
  const team = player.teamId ? TEAMS.find(t => t.id === player.teamId) : null;
  const imageUrl = profile?.image || player.image;
  const cricHeroesUrl = profile?.cricHeroesUrl || player.cricHeroesUrl;

  return (
    <div className="glass rounded-xl p-4 hover:bg-white/10 transition-all">
      {/* Avatar */}
      <div className="flex items-start gap-4">
        <div className="relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={player.name}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center text-xl font-bold ring-2 ring-white/20">
              {getInitials(player.name)}
            </div>
          )}
          {/* Category indicator */}
          {(player.category === 'CAPTAIN' || player.category === 'VICE_CAPTAIN') && (
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: team?.color || '#F59E0B' }}
            >
              {player.category === 'CAPTAIN' ? 'C' : 'VC'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{player.name}</h3>

          {/* Role */}
          {roleDisplay && (
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleDisplay.color} mt-1`}>
              {roleDisplay.icon} {roleDisplay.label}
            </span>
          )}

          {/* Team (for captains/VCs) */}
          {team && (
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: team.color }}
              />
              <span className="text-xs text-white/50 truncate">{team.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${categoryBadge.color}`}>
          {categoryBadge.label}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/50 border border-white/10">
          {player.club}
        </span>
        {player.availability !== 'full' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
            {player.availability === 'till_12' ? 'Till 12' : player.availability === 'till_11' ? 'Till 11' : 'Tentative'}
          </span>
        )}
        {cricHeroesUrl && (
          <a
            href={cricHeroesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
          >
            🏏 CricHeroes
          </a>
        )}
      </div>
    </div>
  );
}

type FilterType = 'all' | 'captains' | 'aplus' | 'base' | 'lrcc' | 'super11';
type RoleFilter = 'all' | 'Batsman' | 'Bowler' | 'All-rounder' | 'WK-Batsman';

export default function PlayersPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [profiles, setProfiles] = useState<Record<string, PlayerProfile>>({});
  const [loading, setLoading] = useState(true);

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/players');
        if (res.ok) {
          const data = await res.json();
          setProfiles(data.profiles || {});
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfiles();
  }, []);

  const filteredPlayers = ALL_PLAYERS.filter(player => {
    // Search filter
    if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (filter === 'captains' && player.category !== 'CAPTAIN' && player.category !== 'VICE_CAPTAIN') {
      return false;
    }
    if (filter === 'aplus' && player.category !== 'APLUS') {
      return false;
    }
    if (filter === 'base' && player.category !== 'BASE') {
      return false;
    }
    if (filter === 'lrcc' && player.club !== 'LRCC') {
      return false;
    }
    if (filter === 'super11' && player.club !== 'Super11') {
      return false;
    }

    // Role filter
    if (roleFilter !== 'all' && player.role !== roleFilter) {
      return false;
    }

    return true;
  });

  // Group by category for display
  const captains = filteredPlayers.filter(p => p.category === 'CAPTAIN' || p.category === 'VICE_CAPTAIN');
  const aplusPlayers = filteredPlayers.filter(p => p.category === 'APLUS');
  const basePlayers = filteredPlayers.filter(p => p.category === 'BASE');

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">All Players</h1>
              <p className="text-sm text-white/50">{ALL_PLAYERS.length} total players</p>
            </div>
            <Link
              href="/"
              className="text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
            >
              ← Back to Auction
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="glass rounded-xl p-4 mb-6">
          {/* Search */}
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { key: 'all', label: 'All' },
              { key: 'captains', label: 'Team Leaders' },
              { key: 'aplus', label: 'A+ Players' },
              { key: 'base', label: 'Base Players' },
              { key: 'lrcc', label: 'LRCC' },
              { key: 'super11', label: 'Super11' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as FilterType)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filter === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'all', label: 'All Roles', icon: '' },
              { key: 'Batsman', label: 'Batsman', icon: '🏏' },
              { key: 'Bowler', label: 'Bowler', icon: '🎯' },
              { key: 'All-rounder', label: 'All-rounder', icon: '⚡' },
              { key: 'WK-Batsman', label: 'WK-Batsman', icon: '🧤' },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setRoleFilter(key as RoleFilter)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  roleFilter === key
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-white/50 mb-4">
          Showing {filteredPlayers.length} of {ALL_PLAYERS.length} players
        </p>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-white/50 text-sm">Loading players...</p>
          </div>
        )}

        {/* Team Leaders Section */}
        {!loading && captains.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
              <span>👑</span> Team Captains & Vice Captains
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {captains.map(player => (
                <PlayerCard key={player.id} player={player} profile={profiles[player.id]} />
              ))}
            </div>
          </section>
        )}

        {/* A+ Players Section */}
        {!loading && aplusPlayers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span>⭐</span> A+ Players
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aplusPlayers.map(player => (
                <PlayerCard key={player.id} player={player} profile={profiles[player.id]} />
              ))}
            </div>
          </section>
        )}

        {/* Base Players Section */}
        {!loading && basePlayers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-white/70 mb-4 flex items-center gap-2">
              <span>🏏</span> Base Players
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {basePlayers.map(player => (
                <PlayerCard key={player.id} player={player} profile={profiles[player.id]} />
              ))}
            </div>
          </section>
        )}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/50">No players found matching your filters</p>
          </div>
        )}
      </div>
    </main>
  );
}
