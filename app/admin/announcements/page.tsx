"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Eye, EyeOff, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminGridPageSkeleton } from "@/components/loading-skeletons";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { useAdminAnnouncements, type AnnouncementItem } from "@/lib/swr";
import { ADMIN_GRID_PAGE_SIZE } from "@/lib/pagination";
import { useDebounce } from "@/hooks/use-debounce";

const EMPTY_FORM = {
  title: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  audience: "ALL",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export default function AnnouncementsAdminPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  const { announcements, pagination, isLoading, mutate } =
    useAdminAnnouncements({
      page,
      limit: ADMIN_GRID_PAGE_SIZE,
      search: debouncedSearchQuery || undefined,
    });

  const toggleActive = async (item: AnnouncementItem) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        `Announcement ${!item.isActive ? "published" : "unpublished"}`,
      );
      mutate();
    } catch {
      toast.error("Failed to update announcement");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/announcements/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
      setDeleteId(null);
      mutate();
    } catch {
      toast.error("Failed to delete announcement");
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          body: form.body,
          imageUrl: form.imageUrl.trim() || null,
          linkUrl: form.linkUrl.trim() || null,
          audience: form.audience,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
          isActive: form.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create");
      }
      toast.success("Announcement published");
      setForm(EMPTY_FORM);
      setFormOpen(false);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && announcements.length === 0) return <AdminGridPageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Announcements</h2>
          <p className="text-muted-foreground mt-1">
            Publish What&apos;s New, new releases, and maintenance notices
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New announcement
        </Button>
      </div>

      <div className="relative max-w-md">
        <Input
          placeholder="Search announcements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-4"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {announcements.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No announcements yet. Publish your first update.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className="bg-card rounded-lg border border-border overflow-hidden"
            >
              {a.imageUrl && (
                <div className="aspect-video relative">
                  <img
                    src={a.imageUrl}
                    alt={a.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span
                    className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      a.isActive
                        ? "bg-green-500/10 text-green-500"
                        : "bg-gray-500/10 text-gray-500"
                    }`}
                  >
                    {a.isActive ? "Live" : "Hidden"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {a.body}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-0.5 rounded-full bg-accent font-medium">
                    {a.audience}
                  </span>
                  <span>
                    {new Date(a.startsAt).toLocaleDateString()}
                  </span>
                  {typeof a._count?.reads === "number" && (
                    <span>{a._count.reads} reads</span>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleActive(a)}
                  >
                    {a.isActive ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" /> Unpublish
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" /> Publish
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(a.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> New announcement
            </DialogTitle>
            <DialogDescription>
              Visible instantly in the app under What&apos;s New.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. New album: …"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Body *</label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="What should users know? Supports plain text, shown with line breaks."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Audience</label>
                <Select
                  value={form.audience}
                  onValueChange={(v) => setForm({ ...form, audience: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Everyone</SelectItem>
                    <SelectItem value="FREE">Free only</SelectItem>
                    <SelectItem value="PREMIUM">Premium only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Link URL</label>
                <Input
                  value={form.linkUrl}
                  onChange={(e) =>
                    setForm({ ...form, linkUrl: e.target.value })
                  }
                  placeholder="/album/… or https://…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Image URL</label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://… (optional cover)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Publish at</label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) =>
                    setForm({ ...form, startsAt: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Expires (optional)</label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Publishing…" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete announcement?</DialogTitle>
            <DialogDescription>
              This removes it from What&apos;s New for all users. Cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
