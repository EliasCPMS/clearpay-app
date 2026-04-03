import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetPipelineByStatus, getGetPipelineByStatusQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LEAD_STATUSES, getScoreColor } from "./leads";
import { Link } from "wouter";

export default function Pipeline() {
  const { data: pipeline } = useGetPipelineByStatus({ query: { queryKey: getGetPipelineByStatusQueryKey() } });

  const getLeadsForStatus = (status: string) => {
    // We don't have a direct hook for leads by status that returns full lead objects easily grouped here
    // So we'll use a hack or just fetch all leads and group them
    return [];
  };

  return (
    <SidebarLayout>
      <div className="p-8 h-full flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Pipeline</h1>
          <p className="text-zinc-400 mt-1 text-sm">Visual overview of all active deals.</p>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="w-full h-full pb-4">
            <div className="flex gap-4 h-full min-w-max pb-4">
              {LEAD_STATUSES.map(status => (
                <KanbanColumn key={status} status={status} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="bg-zinc-900" />
          </ScrollArea>
        </div>
      </div>
    </SidebarLayout>
  );
}

// Separate component to handle per-column data fetching
import { useListLeads, getListLeadsQueryKey } from "@workspace/api-client-react";

function KanbanColumn({ status }: { status: string }) {
  const { data: leads } = useListLeads(
    { status },
    { query: { queryKey: getListLeadsQueryKey({ status }) } }
  );

  const totalVolume = leads?.reduce((sum, lead) => sum + (lead.estimatedMonthlyVolume || 0), 0) || 0;

  return (
    <div className="w-80 flex flex-col h-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl overflow-hidden shrink-0">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white tracking-tight">{status}</h3>
          <Badge variant="outline" className="bg-zinc-800/50 text-zinc-300 border-zinc-700">
            {leads?.length || 0}
          </Badge>
        </div>
        <div className="text-sm font-medium text-primary">
          ${(totalVolume / 1000).toFixed(1)}k
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {leads?.map(lead => (
            <Link key={lead.id} href={`/leads/${lead.id}`}>
              <Card className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                <CardContent className="p-4 space-y-3">
                  <div>
                    <div className="font-medium text-white group-hover:text-primary transition-colors line-clamp-1">
                      {lead.businessName}
                    </div>
                    <div className="text-xs text-zinc-500 line-clamp-1">
                      {lead.contactName}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={getScoreColor(lead.leadScore)}>
                      Score: {lead.leadScore}
                    </Badge>
                    <div className="text-sm font-semibold text-zinc-300">
                      {lead.estimatedMonthlyVolume ? `$${(lead.estimatedMonthlyVolume / 1000).toFixed(0)}k` : '-'}
                    </div>
                  </div>
                  
                  {lead.assignedRepName && (
                    <div className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1">
                      <div className="w-4 h-4 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 border border-zinc-700">
                        {lead.assignedRepName.charAt(0)}
                      </div>
                      {lead.assignedRepName}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}