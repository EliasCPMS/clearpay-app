import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetPipelineByStatus, getGetPipelineByStatusQueryKey, useGetRecentActivity, getGetRecentActivityQueryKey, useGetRepLeaderboard, getGetRepLeaderboardQueryKey } from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, DollarSign, Activity, CheckSquare, Target, Trophy, Clock } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: pipeline } = useGetPipelineByStatus({ query: { queryKey: getGetPipelineByStatusQueryKey() } });
  const { data: activity } = useGetRecentActivity({ query: { queryKey: getGetRecentActivityQueryKey() } });
  const { data: leaderboard } = useGetRepLeaderboard({ query: { queryKey: getGetRepLeaderboardQueryKey() } });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <SidebarLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Command Center</h1>
          <p className="text-zinc-400 mt-1 text-sm">Overview of current sales performance and activities.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Pipeline</CardTitle>
              <DollarSign className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary ? formatCurrency(summary.totalPipelineValue) : '...'}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Leads</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary?.totalLeads ?? '...'}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Win Rate</CardTitle>
              <Target className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary ? `${(summary.winRate * 100).toFixed(1)}%` : '...'}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Due Tasks</CardTitle>
              <CheckSquare className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary?.tasksDueToday ?? '...'}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">New (Month)</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary?.newLeadsThisMonth ?? '...'}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Avg Score</CardTitle>
              <Trophy className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{summary?.avgLeadScore ? Math.round(summary.avgLeadScore) : '...'}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Pipeline Chart */}
          <Card className="lg:col-span-2 bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg text-white">Pipeline by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                {pipeline && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pipeline} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis 
                        dataKey="status" 
                        stroke="#a1a1aa" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis 
                        stroke="#a1a1aa" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(value) => `$${value / 1000}k`}
                      />
                      <Tooltip 
                        cursor={{fill: '#27272a'}}
                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }}
                        formatter={(value: number) => [formatCurrency(value), 'Volume']}
                      />
                      <Bar dataKey="totalVolume" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="bg-zinc-950 border-zinc-800 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg text-white">Top Performers</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-6">
                {leaderboard?.map((rep, i) => (
                  <div key={rep.repId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center font-bold text-sm text-zinc-400 border border-zinc-800">
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">{rep.repName}</div>
                        <div className="text-xs text-zinc-500">{rep.closedWon} Won ({rep.conversionRate.toFixed(0)}%)</div>
                      </div>
                    </div>
                    <div className="font-semibold text-primary text-sm">
                      {formatCurrency(rep.totalVolume)}
                    </div>
                  </div>
                ))}
                {!leaderboard?.length && <div className="text-sm text-zinc-500 py-4 text-center">No rep data available</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity?.map((item) => (
                <div key={item.id} className="flex items-start gap-4 text-sm pb-4 border-b border-zinc-800/50 last:border-0 last:pb-0">
                  <div className="mt-0.5 text-zinc-500">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-300">
                      <span className="font-medium text-white">{item.repName || 'System'}</span> {item.description}
                      {item.leadName && <span className="font-medium text-white ml-1">({item.leadName})</span>}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">{format(new Date(item.createdAt), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
              {!activity?.length && <div className="text-sm text-zinc-500 py-4 text-center">No recent activity</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
