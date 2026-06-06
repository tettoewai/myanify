"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus, X } from "lucide-react";
import { AdminFormPageSkeleton } from "@/components/loading-skeletons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";
import { mutate } from "swr";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    type: "MONTHLY",
    isActive: true,
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch(`/api/admin/plans/${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch plan");
        }
        const data = await response.json();
        const plan = data.plan;

        setFormData({
          name: plan.name,
          description: plan.description || "",
          price: plan.price.toString(),
          type: plan.type || "MONTHLY",
          isActive: plan.isActive,
        });
        setFeatures(Array.isArray(plan.features) ? plan.features : []);
      } catch (error) {
        console.error("Error fetching plan:", error);
        toast.error("Failed to load plan details");
        router.push("/admin/plans");
      } finally {
        setFetching(false);
      }
    };

    if (id) {
      fetchPlan();
    }
  }, [id, router]);

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFeatures([...features, newFeature.trim()]);
    setNewFeature("");
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          features,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update plan");
      }

      toast.success("Plan updated successfully");
      mutate("/api/admin/plans");
      router.push("/admin/plans");
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <AdminFormPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/plans">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Edit Plan</h2>
          <p className="text-muted-foreground mt-1">
            Update subscription plan details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plan Details</CardTitle>
          <CardDescription>
            Update the details for this subscription plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                placeholder="e.g. Monthly Premium"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the plan..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (MMK)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 5000"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Plan Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="LIFETIME">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature (e.g. Ad-free listening)"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFeature();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddFeature}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="bg-muted px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      <span>{feature}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex justify-end gap-4">
              <Button variant="outline" asChild>
                <Link href="/admin/plans">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Update Plan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
