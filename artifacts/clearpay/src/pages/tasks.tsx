import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTasks, getListTasksQueryKey,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListReps, getListRepsQueryKey,
} from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PRIORITIES = ["low", "medium", "high", "urgent"];

function priorityColor(p: string) {
  if (p === "urgent") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (p === "high") return "bg-orange-500/20 text-orange-400 border-orange-500/30";
  if (p === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
}

export default function Tasks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [filterRep, setFilterRep] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDueToday, setFilterDueToday] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", priority: "medium", assignedTo: "none" });

  const params: Record<string, unknown> = {};
  if (filterRep !== "all") params.assignedTo = parseInt(filterRep);
  if (filterPriority !== "all") params.priority = filterPriority;
  if (filterDueToday) params.dueToday = true;
  if (!showCompleted) params.completed = false;

  const { data: tasks, isLoading } = useListTasks(params as Parameters<typeof useListTasks>[0], { query: { queryKey: getListTasksQueryKey(params as Parameters<typeof useListTasks>[0]) } });
  const { data: reps } = useListReps({ query: { queryKey: getListRepsQueryKey() } });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createTask.mutate({ data: {
      title: form.title,
      description: form.description || null,
      dueDate: form.dueDate || null,
      priority: form.priority,
      assignedTo: form.assignedTo && form.assignedTo !== "none" ? parseInt(form.assignedTo) : null,
    }}, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        setShowCreate(false);
        setForm({ title: "", description: "", dueDate: "", priority: "medium", assignedTo: "none" });
        toast({ title: "Task created" });
      },
    });
  };

  const toggleComplete = (id: number, completed: boolean) => {
    updateTask.mutate({ id, data: { completed } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
    });
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
        toast({ title: "Task deleted" });
      },
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Tasks</h1>
            <p className="text-zinc-400 mt-1 text-sm">Manage all tasks across your pipeline.</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-new-task">
            <Plus className="w-4 h-4 mr-1" /> New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700 text-white h-8 text-sm" data-testid="select-filter-rep"><SelectValue placeholder="All Reps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {reps?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-36 bg-zinc-900 border-zinc-700 text-white h-8 text-sm" data-testid="select-filter-priority"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant={filterDueToday ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterDueToday(!filterDueToday)}
            className={filterDueToday ? "bg-primary text-white" : "border-zinc-700 text-zinc-400"}
            data-testid="button-filter-due-today"
          >
            <Calendar className="w-3 h-3 mr-1" /> Due Today
          </Button>
          <Button
            variant={showCompleted ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCompleted(!showCompleted)}
            className={showCompleted ? "bg-primary text-white" : "border-zinc-700 text-zinc-400"}
            data-testid="button-show-completed"
          >
            Show Completed
          </Button>
          {(filterRep !== "all" || filterPriority !== "all" || filterDueToday) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterRep("all"); setFilterPriority("all"); setFilterDueToday(false); }} className="text-zinc-500">
              Clear
            </Button>
          )}
        </div>

        {/* Tasks list */}
        <div className="space-y-2">
          {isLoading && <p className="text-zinc-500 text-sm">Loading...</p>}
          {!isLoading && tasks?.length === 0 && <p className="text-zinc-500 text-sm">No tasks found.</p>}
          {tasks?.map(task => (
            <Card key={task.id} className={cn("border transition-colors", task.completed ? "bg-zinc-900/30 border-zinc-800/50" : "bg-zinc-950 border-zinc-800 hover:border-zinc-700")} data-testid={`task-row-${task.id}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <Checkbox checked={task.completed} onCheckedChange={v => toggleComplete(task.id, !!v)} data-testid={`checkbox-task-${task.id}`} />
                <div className="flex-1 min-w-0">
                  <span className={cn("text-sm font-medium", task.completed ? "line-through text-zinc-500" : "text-white")}>{task.title}</span>
                  <div className="flex gap-3 mt-0.5">
                    {task.leadName && <span className="text-xs text-zinc-500">Lead: {task.leadName}</span>}
                    {task.assignedToName && <span className="text-xs text-zinc-500">Rep: {task.assignedToName}</span>}
                    {task.dueDate && (
                      <span className={cn("text-xs", task.dueDate < today! && !task.completed ? "text-red-400" : "text-zinc-500")}>
                        Due: {task.dueDate}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={cn("text-xs border", priorityColor(task.priority))}>{task.priority}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(task.id)}
                  className="text-zinc-600 hover:text-red-400 h-7 w-7 p-0"
                  data-testid={`button-delete-task-${task.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-zinc-400">Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" data-testid="input-task-title" />
            </div>
            <div>
              <Label className="text-zinc-400">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-zinc-400">Due Date</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-white mt-1" />
              </div>
              <div>
                <Label className="text-zinc-400">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-zinc-400">Assign To</Label>
              <Select value={form.assignedTo} onValueChange={v => setForm(f => ({ ...f, assignedTo: v }))}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {reps?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">Cancel</Button>
            <Button onClick={handleCreate} disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-create-task">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
