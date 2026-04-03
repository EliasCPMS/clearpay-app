import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReps, getListRepsQueryKey,
  useCreateRep,
  useUpdateRep,
  useDeleteRep,
  useGetRepLeaderboard, getGetRepLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editRep, setEditRep] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "rep", password: "" });

  const { data: reps, isLoading } = useListReps({ query: { queryKey: getListRepsQueryKey() } });
  const { data: leaderboard } = useGetRepLeaderboard({ query: { queryKey: getGetRepLeaderboardQueryKey() } });
  const createRep = useCreateRep();
  const updateRep = useUpdateRep();
  const deleteRep = useDeleteRep();

  const getStats = (repId: number) => leaderboard?.find(l => l.repId === repId);

  const handleCreate = () => {
    if (!form.name || !form.email) return;
    createRep.mutate({ data: { name: form.name, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) } as Parameters<typeof createRep.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRepLeaderboardQueryKey() });
        setShowCreate(false);
        setForm({ name: "", email: "", role: "rep", password: "" });
        toast({ title: "Rep added" });
      },
    });
  };

  const handleEdit = (rep: { id: number; name: string; email: string; role: string }) => {
    setEditRep(rep);
    setForm({ name: rep.name, email: rep.email, role: rep.role, password: "" });
  };

  const handleUpdate = () => {
    if (!editRep) return;
    updateRep.mutate({ id: editRep.id, data: { name: form.name, email: form.email, role: form.role } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
        setEditRep(null);
        toast({ title: "Rep updated" });
      },
    });
  };

  const handleDelete = (id: number) => {
    deleteRep.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRepLeaderboardQueryKey() });
        toast({ title: "Rep removed" });
      },
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Sales Reps</h1>
            <p className="text-zinc-400 mt-1 text-sm">Manage your team and track performance.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-new-rep">
            <Plus className="w-4 h-4 mr-1" /> Add Rep
          </Button>
        </div>

        {/* Performance table */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Rep</th>
                    <th className="text-left py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Role</th>
                    <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Total Leads</th>
                    <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Closed Won</th>
                    <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Conv. Rate</th>
                    <th className="text-right py-2 px-3 text-zinc-500 font-medium text-xs uppercase tracking-wider">Pipeline Volume</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr><td colSpan={7} className="py-4 text-center text-zinc-500">Loading...</td></tr>
                  )}
                  {reps?.map(rep => {
                    const stats = getStats(rep.id);
                    return (
                      <tr key={rep.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50" data-testid={`rep-row-${rep.id}`}>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
                              {rep.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                            </div>
                            <span className="text-white font-medium">{rep.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge className={rep.role === "admin" ? "bg-primary/20 text-primary" : "bg-zinc-800 text-zinc-400"}>
                            {rep.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-300">{stats?.totalLeads ?? 0}</td>
                        <td className="py-3 px-3 text-right text-green-400 font-medium">{stats?.closedWon ?? 0}</td>
                        <td className="py-3 px-3 text-right text-zinc-300">
                          {stats ? `${Math.round(stats.conversionRate * 100)}%` : "0%"}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-300">
                          {stats ? `$${stats.totalVolume.toLocaleString()}` : "$0"}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(rep)} className="h-7 w-7 p-0 text-zinc-500 hover:text-white" data-testid={`button-edit-rep-${rep.id}`}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(rep.id)} className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400" data-testid={`button-delete-rep-${rep.id}`}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader><DialogTitle>Add Rep</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-zinc-400">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-rep-name" /></div>
            <div><Label className="text-zinc-400">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-rep-email" /></div>
            <div><Label className="text-zinc-400">Password (min 6 chars)</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set login password" className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-rep-password" /></div>
            <div>
              <Label className="text-zinc-400">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="rep">rep</SelectItem><SelectItem value="admin">admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleCreate} disabled={createRep.isPending} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-create-rep">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editRep} onOpenChange={() => setEditRep(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader><DialogTitle>Edit Rep</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-zinc-400">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
            <div><Label className="text-zinc-400">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" /></div>
            <div>
              <Label className="text-zinc-400">Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="rep">rep</SelectItem><SelectItem value="admin">admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditRep(null)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateRep.isPending} className="bg-primary hover:bg-primary/90 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
