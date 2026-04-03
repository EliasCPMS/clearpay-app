import { useState } from "react";
import { Link } from "wouter";
import { useListLeads, getListLeadsQueryKey, useListReps, getListRepsQueryKey, useCreateLead, getGetDashboardSummaryQueryKey, getGetPipelineByStatusQueryKey } from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Filter } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";

export function getScoreColor(score: number) {
  if (score >= 71) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (score >= 41) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export function getStatusColor(status: string) {
  switch (status) {
    case "New": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "Verified": return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
    case "Contacted": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "Replied": return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    case "Qualified": return "bg-pink-500/10 text-pink-500 border-pink-500/20";
    case "Meeting Booked": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    case "Proposal Sent": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "Closed Won": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "Closed Lost": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "Onboarding": return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    default: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
  }
}

export const LEAD_STATUSES = [
  "New", "Verified", "Contacted", "Replied", "Qualified", 
  "Meeting Booked", "Proposal Sent", "Closed Won", "Closed Lost", "Onboarding"
];

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: leads } = useListLeads(
    { search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined },
    { query: { queryKey: getListLeadsQueryKey({ search: search || undefined, status: statusFilter !== "all" ? statusFilter : undefined }) } }
  );

  return (
    <SidebarLayout>
      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Leads</h1>
            <p className="text-zinc-400 mt-1 text-sm">Manage and track your pipeline.</p>
          </div>
          <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <SheetTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-black font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                New Lead
              </Button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 border-zinc-800 text-white w-full sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white">Create New Lead</SheetTitle>
              </SheetHeader>
              <CreateLeadForm onSuccess={() => setIsCreateOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search leads..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950 border-zinc-800 text-white focus-visible:ring-primary w-full"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-zinc-950 border-zinc-800 text-white focus:ring-primary">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filter Status" />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              {LEAD_STATUSES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader className="bg-zinc-900 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-zinc-400 font-medium">Business</TableHead>
                <TableHead className="text-zinc-400 font-medium">Contact</TableHead>
                <TableHead className="text-zinc-400 font-medium">Status</TableHead>
                <TableHead className="text-zinc-400 font-medium">Score</TableHead>
                <TableHead className="text-zinc-400 font-medium">Rep</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right">Volume</TableHead>
                <TableHead className="text-zinc-400 font-medium text-right">Next Follow Up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow key={lead.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                  <TableCell className="font-medium">
                    <Link href={`/leads/${lead.id}`} className="text-white hover:text-primary transition-colors">
                      {lead.businessName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-zinc-300">{lead.contactName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getScoreColor(lead.leadScore)}>
                      {lead.leadScore}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">{lead.assignedRepName || 'Unassigned'}</TableCell>
                  <TableCell className="text-right text-zinc-300 font-medium">
                    {lead.estimatedMonthlyVolume ? `$${(lead.estimatedMonthlyVolume / 1000).toFixed(0)}k` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-zinc-400 text-sm">
                    {lead.nextFollowUpDate ? format(new Date(lead.nextFollowUpDate), 'MMM d, yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {!leads?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-zinc-500">
                    No leads found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </SidebarLayout>
  );
}

function CreateLeadForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    businessName: "",
    contactName: "",
    email: "",
    phone: "",
    estimatedMonthlyVolume: "",
    status: "New",
    assignedRepId: "none",
  });

  const { data: reps } = useListReps({ query: { queryKey: getListRepsQueryKey() } });
  
  const createLead = useCreateLead();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLead.mutate({
      data: {
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email || null,
        phone: formData.phone || null,
        estimatedMonthlyVolume: formData.estimatedMonthlyVolume ? Number(formData.estimatedMonthlyVolume) : null,
        status: formData.status,
        assignedRepId: formData.assignedRepId !== "none" ? Number(formData.assignedRepId) : null,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPipelineByStatusQueryKey() });
        onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label htmlFor="businessName" className="text-zinc-300">Business Name</Label>
        <Input 
          id="businessName" 
          value={formData.businessName}
          onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactName" className="text-zinc-300">Contact Name</Label>
        <Input 
          id="contactName" 
          value={formData.contactName}
          onChange={e => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300">Email</Label>
          <Input 
            id="email" 
            type="email"
            value={formData.email}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-zinc-300">Phone</Label>
          <Input 
            id="phone" 
            value={formData.phone}
            onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="volume" className="text-zinc-300">Est. Monthly Volume ($)</Label>
        <Input 
          id="volume" 
          type="number"
          value={formData.estimatedMonthlyVolume}
          onChange={e => setFormData(prev => ({ ...prev, estimatedMonthlyVolume: e.target.value }))}
          className="bg-zinc-900 border-zinc-800 text-white focus-visible:ring-primary"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">Status</Label>
        <Select 
          value={formData.status} 
          onValueChange={v => setFormData(prev => ({ ...prev, status: v }))}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white focus:ring-primary">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
            {LEAD_STATUSES.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">Assigned Rep</Label>
        <Select 
          value={formData.assignedRepId} 
          onValueChange={v => setFormData(prev => ({ ...prev, assignedRepId: v }))}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white focus:ring-primary">
            <SelectValue placeholder="Select rep" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
            <SelectItem value="none">Unassigned</SelectItem>
            {reps?.map(rep => (
              <SelectItem key={rep.id} value={rep.id.toString()}>{rep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
          disabled={createLead.isPending}
        >
          {createLead.isPending ? "Creating..." : "Create Lead"}
        </Button>
      </div>
    </form>
  );
}