import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetLead, getGetLeadQueryKey,
  useUpdateLead,
  useListLeadNotes, getListLeadNotesQueryKey,
  useCreateLeadNote,
  useListLeadTasks, getListLeadTasksQueryKey,
  useCreateTask, useUpdateTask,
  useGetLeadAiInsight, getGetLeadAiInsightQueryKey,
  useListReps, getListRepsQueryKey,
} from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Bot, Lightbulb, MessageSquare, CheckSquare, Edit, Save, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUSES = ["New", "Verified", "Contacted", "Replied", "Qualified", "Meeting Booked", "Proposal Sent", "Closed Won", "Closed Lost", "Onboarding"];
const VERTICALS = ["Restaurant", "Retail", "Healthcare", "Hospitality", "Ecommerce", "Automotive", "Salon", "Gym", "Services"];
const LEAD_SOURCES = ["Referral", "Warm Referral", "Inbound", "Trade Show", "Cold Call", "Social Media", "Website", "Email"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function scoreColor(score: number) {
  if (score >= 71) return "bg-green-500/20 text-green-400 border-green-500/30";
  if (score >= 41) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-red-500/20 text-red-400 border-red-500/30";
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    "New": "bg-blue-500/20 text-blue-400",
    "Verified": "bg-cyan-500/20 text-cyan-400",
    "Contacted": "bg-purple-500/20 text-purple-400",
    "Replied": "bg-indigo-500/20 text-indigo-400",
    "Qualified": "bg-yellow-500/20 text-yellow-400",
    "Meeting Booked": "bg-orange-500/20 text-orange-400",
    "Proposal Sent": "bg-pink-500/20 text-pink-400",
    "Closed Won": "bg-green-500/20 text-green-400",
    "Closed Lost": "bg-red-500/20 text-red-400",
    "Onboarding": "bg-teal-500/20 text-teal-400",
  };
  return map[status] ?? "bg-zinc-500/20 text-zinc-400";
}

export default function LeadDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [newNote, setNewNote] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [aiLoading, setAiLoading] = useState(false);

  const { data: lead, isLoading } = useGetLead(id, { query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) } });
  const { data: notes } = useListLeadNotes(id, { query: { enabled: !!id, queryKey: getListLeadNotesQueryKey(id) } });
  const { data: tasks } = useListLeadTasks(id, { query: { enabled: !!id, queryKey: getListLeadTasksQueryKey(id) } });
  const { data: reps } = useListReps({ query: { queryKey: getListRepsQueryKey() } });
  const { data: aiInsight, refetch: refetchAi } = useGetLeadAiInsight(id, {
    query: { enabled: false, queryKey: getGetLeadAiInsightQueryKey(id) }
  });

  const updateLead = useUpdateLead();
  const createNote = useCreateLeadNote();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const handleEdit = () => {
    if (!lead) return;
    setEditData({
      businessName: lead.businessName,
      contactName: lead.contactName,
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      website: lead.website ?? "",
      vertical: lead.vertical ?? "",
      leadSource: lead.leadSource ?? "",
      existingPos: lead.existingPos ?? "",
      processor: lead.processor ?? "",
      estimatedMonthlyVolume: lead.estimatedMonthlyVolume ?? "",
      status: lead.status,
      assignedRepId: lead.assignedRepId ?? null,
      lastContactDate: lead.lastContactDate ?? "",
      nextFollowUpDate: lead.nextFollowUpDate ?? "",
      notes: lead.notes ?? "",
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateLead.mutate({ id, data: {
      ...editData,
      estimatedMonthlyVolume: editData.estimatedMonthlyVolume ? Number(editData.estimatedMonthlyVolume) : null,
      assignedRepId: editData.assignedRepId ? Number(editData.assignedRepId) : null,
    } as Parameters<typeof updateLead.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(id) });
        setEditing(false);
        toast({ title: "Lead updated" });
      },
    });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    createNote.mutate({ id, data: { content: newNote } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadNotesQueryKey(id) });
        setNewNote("");
        toast({ title: "Note added" });
      },
    });
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    createTask.mutate({ data: { leadId: id, title: newTaskTitle, dueDate: newTaskDue || null, priority: newTaskPriority } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadTasksQueryKey(id) });
        setNewTaskTitle("");
        setNewTaskDue("");
        setNewTaskPriority("medium");
        toast({ title: "Task created" });
      },
    });
  };

  const toggleTask = (taskId: number, completed: boolean) => {
    updateTask.mutate({ id: taskId, data: { completed } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadTasksQueryKey(id) });
      },
    });
  };

  const handleLoadAi = async () => {
    setAiLoading(true);
    await refetchAi();
    setAiLoading(false);
  };

  if (isLoading) {
    return <SidebarLayout><div className="p-8 text-zinc-400">Loading...</div></SidebarLayout>;
  }

  if (!lead) {
    return <SidebarLayout><div className="p-8 text-zinc-400">Lead not found.</div></SidebarLayout>;
  }

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")} className="text-zinc-400 hover:text-white" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-1" /> Leads
          </Button>
          <div className="flex items-center gap-3 flex-1">
            <h1 className="text-2xl font-bold text-white">{lead.businessName}</h1>
            <Badge className={statusColor(lead.status)}>{lead.status}</Badge>
            <Badge className={cn("border", scoreColor(lead.leadScore))}>{lead.leadScore}/100</Badge>
          </div>
          {!editing ? (
            <Button size="sm" onClick={handleEdit} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-edit-lead">
              <Edit className="w-4 h-4 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={updateLead.isPending} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-save-lead">
                <Save className="w-4 h-4 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="text-zinc-400" data-testid="button-cancel-edit">
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Lead info */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Contact", field: "contactName", value: lead.contactName },
                { label: "Phone", field: "phone", value: lead.phone },
                { label: "Email", field: "email", value: lead.email },
                { label: "Website", field: "website", value: lead.website },
                { label: "Vertical", field: "vertical", value: lead.vertical, type: "vertical-select" },
                { label: "Lead Source", field: "leadSource", value: lead.leadSource, type: "source-select" },
                { label: "Existing POS", field: "existingPos", value: lead.existingPos },
                { label: "Current Processor", field: "processor", value: lead.processor },
                { label: "Monthly Volume", field: "estimatedMonthlyVolume", value: lead.estimatedMonthlyVolume ? `$${lead.estimatedMonthlyVolume.toLocaleString()}` : null },
                { label: "Status", field: "status", value: lead.status, type: "status-select" },
                { label: "Assigned Rep", field: "assignedRepId", value: lead.assignedRepName, type: "rep-select" },
                { label: "Last Contact", field: "lastContactDate", value: lead.lastContactDate, type: "date" },
                { label: "Next Follow-up", field: "nextFollowUpDate", value: lead.nextFollowUpDate, type: "date" },
              ].map(({ label, field, value, type }) => (
                <div key={field}>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{label}</div>
                  {editing ? (
                    type === "status-select" ? (
                      <Select value={String(editData[field] ?? "")} onValueChange={v => setEditData(d => ({ ...d, [field]: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : type === "vertical-select" ? (
                      <Select value={String(editData[field] ?? "")} onValueChange={v => setEditData(d => ({ ...d, [field]: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{VERTICALS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : type === "source-select" ? (
                      <Select value={String(editData[field] ?? "")} onValueChange={v => setEditData(d => ({ ...d, [field]: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>{LEAD_SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : type === "rep-select" ? (
                      <Select value={editData["assignedRepId"] ? String(editData["assignedRepId"]) : "unassigned"} onValueChange={v => setEditData(d => ({ ...d, assignedRepId: v === "unassigned" ? null : parseInt(v) }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {reps?.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={type === "date" ? "date" : "text"}
                        value={String(editData[field] ?? "")}
                        onChange={e => setEditData(d => ({ ...d, [field]: e.target.value }))}
                        className="h-8 text-sm bg-zinc-900 border-zinc-700 text-white"
                      />
                    )
                  ) : (
                    <div className="text-sm text-white">{value ?? <span className="text-zinc-600">—</span>}</div>
                  )}
                </div>
              ))}
            </div>
            {editing && (
              <div className="mt-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Notes</div>
                <Textarea
                  value={String(editData.notes ?? "")}
                  onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))}
                  className="bg-zinc-900 border-zinc-700 text-white text-sm"
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="notes">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-1" /> Notes ({notes?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <CheckSquare className="w-4 h-4 mr-1" /> Tasks ({tasks?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Bot className="w-4 h-4 mr-1" /> AI Insight
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="bg-zinc-900 border-zinc-700 text-white flex-1"
                rows={2}
                data-testid="textarea-new-note"
              />
              <Button onClick={handleAddNote} disabled={createNote.isPending} className="bg-primary hover:bg-primary/90 text-white self-end" data-testid="button-add-note">
                Add
              </Button>
            </div>
            <div className="space-y-3">
              {notes?.map(note => (
                <Card key={note.id} className="bg-zinc-950 border-zinc-800" data-testid={`note-${note.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-primary">{note.authorName ?? "Unknown"}</span>
                      <span className="text-xs text-zinc-500">
                        {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{note.content}</p>
                  </CardContent>
                </Card>
              ))}
              {notes?.length === 0 && <p className="text-zinc-500 text-sm">No notes yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="mt-4 space-y-3">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input placeholder="Task title..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white flex-1" data-testid="input-task-title" />
                  <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white w-36" data-testid="input-task-due" />
                  <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                    <SelectTrigger className="w-28 bg-zinc-900 border-zinc-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button onClick={handleAddTask} disabled={createTask.isPending} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-add-task">Add</Button>
                </div>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {tasks?.map(task => (
                <Card key={task.id} className={cn("border", task.completed ? "bg-zinc-900/50 border-zinc-800/50" : "bg-zinc-950 border-zinc-800")} data-testid={`task-${task.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox checked={task.completed} onCheckedChange={v => toggleTask(task.id, !!v)} data-testid={`checkbox-task-${task.id}`} />
                    <div className="flex-1">
                      <span className={cn("text-sm", task.completed ? "line-through text-zinc-500" : "text-white")}>{task.title}</span>
                      {task.dueDate && <span className="ml-2 text-xs text-zinc-500">{task.dueDate}</span>}
                    </div>
                    <Badge className={cn("text-xs", task.priority === "urgent" ? "bg-red-500/20 text-red-400" : task.priority === "high" ? "bg-orange-500/20 text-orange-400" : "bg-zinc-500/20 text-zinc-400")}>
                      {task.priority}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {tasks?.length === 0 && <p className="text-zinc-500 text-sm">No tasks yet.</p>}
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-4">
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> AI Lead Analysis</CardTitle>
                {!aiInsight && (
                  <Button size="sm" onClick={handleLoadAi} disabled={aiLoading} className="bg-primary hover:bg-primary/90 text-white" data-testid="button-load-ai">
                    {aiLoading ? "Analyzing..." : "Generate Insight"}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {aiInsight ? (
                  <>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Summary</div>
                      <p className="text-sm text-zinc-300">{aiInsight.summary}</p>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Score Explanation</div>
                      <p className="text-sm text-zinc-300">{aiInsight.scoreExplanation}</p>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Next Best Action</div>
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-white font-medium">{aiInsight.nextBestAction}</p>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Recommendations</div>
                      <ul className="space-y-1">
                        {aiInsight.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleLoadAi} disabled={aiLoading} className="border-zinc-700 text-zinc-400" data-testid="button-refresh-ai">
                      Refresh Analysis
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                    <p className="text-sm">Click "Generate Insight" to get an AI analysis of this lead.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarLayout>
  );
}
