"use client";

import { useEffect, useState } from "react";
import { Music, Users, Tag, TrendingUp, Play, Heart } from "lucide-react";
import { prisma } from "@/db";

export const dynamic = "force-dynamic";

interface DashboardStats {
  totalSongs: number;
  publishedSongs: number;
  totalArtists: number;
  totalGenres: number;
  totalPlays: number;
  totalLikes: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching stats:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Songs",
      value: stats?.totalSongs || 0,
      icon: Music,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Published Songs",
      value: stats?.publishedSongs || 0,
      icon: Play,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Artists",
      value: stats?.totalArtists || 0,
      icon: Users,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Genres",
      value: stats?.totalGenres || 0,
      icon: Tag,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total Plays",
      value: stats?.totalPlays || 0,
      icon: TrendingUp,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "Total Likes",
      value: stats?.totalLikes || 0,
      icon: Heart,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your music platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a
              href="/admin/songs"
              className="block p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="font-medium">Manage Songs</span>
              <p className="text-sm text-muted-foreground">
                Add, edit, or remove songs
              </p>
            </a>
            <a
              href="/admin/artists"
              className="block p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="font-medium">Manage Artists</span>
              <p className="text-sm text-muted-foreground">
                Create and update artist profiles
              </p>
            </a>
            <a
              href="/admin/genres"
              className="block p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <span className="font-medium">Manage Genres</span>
              <p className="text-sm text-muted-foreground">
                Organize music by genres
              </p>
            </a>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">
            Activity feed coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
