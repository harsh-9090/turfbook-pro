import { useState, useEffect } from "react";
import { Trash2, CheckCircle, XCircle, Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  rating: number;
  status: 'pending' | 'approved';
  is_featured: boolean;
  created_at: string;
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const fetchTestimonials = async () => {
    try {
      const res = await api.get("/testimonials/admin");
      setTestimonials(res.data);
    } catch { toast.error("Failed to load testimonials"); }
  };

  useEffect(() => { fetchTestimonials(); }, []);

  const handleStatus = async (id: string, status: 'approved' | 'pending') => {
    try {
      await api.patch(`/testimonials/${id}/status`, { status });
      toast.success(status === 'approved' ? "Review approved!" : "Moved to pending");
      fetchTestimonials();
    } catch { toast.error("Failed to update status"); }
  };

  const handleToggleFeature = async (id: string) => {
    try {
      await api.patch(`/testimonials/${id}/feature`);
      toast.success("Featured status toggled");
      fetchTestimonials();
    } catch { toast.error("Failed to toggle feature status"); }
  };

  const handleDelete = (id: string) => {
    toast("Delete this review permanently?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await api.delete(`/testimonials/${id}`);
            toast.success("Review deleted");
            fetchTestimonials();
          } catch {
            toast.error("Failed to delete review");
          }
        }
      },
      cancel: { label: "Cancel", onClick: () => {} }
    });
  };

  const filtered = testimonials.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">Testimonials Management</h2>
          <p className="text-sm text-muted-foreground">Approve or feature player reviews for the landing page</p>
        </div>
        <div className="flex bg-secondary/50 p-1 rounded-lg w-full sm:w-auto overflow-x-auto scrollbar-none">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-card border border-border rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-turf flex items-center justify-center text-primary-foreground font-bold">
                {t.name[0]}
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    {t.name}
                    {t.is_featured && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20 py-0 text-[10px]">
                        <Star className="w-2.5 h-2.5 mr-1 fill-yellow-500" /> Featured
                      </Badge>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground">{t.role || "Player"} • {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < t.rating ? "text-accent fill-accent" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground italic">"{t.text}"</p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {t.status === 'pending' ? (
                  <Button size="sm" onClick={() => handleStatus(t.id, 'approved')} className="h-8 bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20 px-3">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs">Approve</span>
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => handleStatus(t.id, 'pending')} className="h-8 text-muted-foreground px-3">
                    <XCircle className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs">Pending</span>
                  </Button>
                )}
                
                <Button size="sm" variant="ghost" onClick={() => handleToggleFeature(t.id)} className={`h-8 px-3 ${t.is_featured ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  <Star className={`w-3.5 h-3.5 mr-1.5 ${t.is_featured ? 'fill-yellow-500' : ''}`} /> 
                  <span className="text-xs">{t.is_featured ? 'Unfeature' : 'Feature'}</span>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="h-8 text-destructive hover:bg-destructive/10 px-3 ml-auto sm:ml-0">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> <span className="text-xs">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-xl bg-card/50">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20 text-muted-foreground" />
            <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} testimonials found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
