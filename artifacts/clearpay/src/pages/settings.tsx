import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListReps, getListRepsQueryKey,
  useCreateRep,
  useUpdateRep,
  useDeleteRep,
} from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Users, Bell, Palette, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showCreate, setShowCreate] = useState(false);
  const [editRep, setEditRep] = useState<{ id: number; name: string; email: string; role: string } | null>(null);
  const [form, setForm] = useState({ name: "", email: "", role: "rep", password: "" });
  const [notifications, setNotifications] = useState({ taskReminders: true, leadUpdates: true, weeklyReport: false });

  const { data: reps } = useListReps({ query: { queryKey: getListRepsQueryKey() } });
  const createRep = useCreateRep();
  const updateRep = useUpdateRep();
  const deleteRep = useDeleteRep();

  const handleCreate = () => {
    if (!form.name || !form.email) return;
    createRep.mutate({ data: { name: form.name, email: form.email, role: form.role, ...(form.password ? { password: form.password } : {}) } as Parameters<typeof createRep.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
        setShowCreate(false);
        setForm({ name: "", email: "", role: "rep", password: "" });
        toast({ title: "Rep added" });
      },
    });
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

  const handleDelete = (id: number, name: string) => {
    deleteRep.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepsQueryKey() });
        toast({ title: `${name} removed` });
      },
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-zinc-400 mt-1 text-sm">Manage your team, preferences, and account settings.</p>
        </div>

        {/* Team Management — admin only */}
        {isAdmin && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle className="text-white">Team Management</CardTitle>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-add-rep-settings">
              <Plus className="w-4 h-4 mr-1" /> Add Rep
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reps?.map(rep => (
                <div key={rep.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800" data-testid={`settings-rep-${rep.id}`}>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {rep.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{rep.name}</div>
                    <div className="text-xs text-zinc-500">{rep.email}</div>
                  </div>
                  <Badge className={rep.role === "admin" ? "bg-primary/20 text-primary" : "bg-zinc-800 text-zinc-400"}>
                    {rep.role}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditRep(rep); setForm({ name: rep.name, email: rep.email, role: rep.role }); }} className="h-7 w-7 p-0 text-zinc-500 hover:text-white" data-testid={`button-edit-rep-${rep.id}`}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rep.id, rep.name)} className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400" data-testid={`button-delete-rep-${rep.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Preferences */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle className="text-white">Notification Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "taskReminders", label: "Task Reminders", desc: "Get notified when tasks are due" },
              { key: "leadUpdates", label: "Lead Status Updates", desc: "Notifications when leads change status" },
              { key: "weeklyReport", label: "Weekly Summary", desc: "Receive a weekly pipeline performance report" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{label}</div>
                  <div className="text-xs text-zinc-500">{desc}</div>
                </div>
                <Switch
                  checked={notifications[key as keyof typeof notifications]}
                  onCheckedChange={v => setNotifications(n => ({ ...n, [key]: v }))}
                  data-testid={`switch-${key}`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle className="text-white">About ClearPay</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <div className="flex justify-between"><span>Version</span><span className="text-white">1.0.0</span></div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between"><span>Platform</span><span className="text-white">ClearPay Sales System</span></div>
            <Separator className="bg-zinc-800" />
            <div className="flex justify-between"><span>Lead Scoring</span><span className="text-white">Volume + Vertical + Source + Recency</span></div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader><DialogTitle>Add Rep</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="text-zinc-400">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-name" /></div>
            <div><Label className="text-zinc-400">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-email" /></div>
            <div><Label className="text-zinc-400">Password (min 6 chars)</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Set login password" className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-password" /></div>
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
            <Button onClick={handleCreate} disabled={createRep.isPending} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-confirm-add-rep">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
