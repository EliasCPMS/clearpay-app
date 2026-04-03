import { useQueryClient } from "@tanstack/react-query";
import {
  useListOnboarding, getListOnboardingQueryKey,
  useUpdateOnboarding,
} from "@workspace/api-client-react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "applicationSubmitted", label: "Application Submitted" },
  { key: "underwritingApproved", label: "Underwriting Approved" },
  { key: "equipmentShipped", label: "Equipment Shipped" },
  { key: "accountActivated", label: "Account Activated" },
  { key: "trainingCompleted", label: "Training Completed" },
] as const;

type StepKey = typeof STEPS[number]["key"];

interface OnboardingRecord {
  id: number;
  leadId: number;
  merchantName: string;
  applicationSubmitted: boolean;
  underwritingApproved: boolean;
  equipmentShipped: boolean;
  accountActivated: boolean;
  trainingCompleted: boolean;
  notes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function Onboarding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: records, isLoading } = useListOnboarding({ query: { queryKey: getListOnboardingQueryKey() } });
  const updateOnboarding = useUpdateOnboarding();

  const getProgress = (record: OnboardingRecord) => {
    const completed = STEPS.filter(s => record[s.key]).length;
    return { completed, total: STEPS.length, pct: Math.round((completed / STEPS.length) * 100) };
  };

  const toggleStep = (record: OnboardingRecord, step: StepKey, value: boolean) => {
    updateOnboarding.mutate({ id: record.id, data: { [step]: value } as Parameters<typeof updateOnboarding.mutate>[0]["data"] }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOnboardingQueryKey() });
        toast({ title: `Step ${value ? "completed" : "unchecked"}` });
      },
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Onboarding Tracker</h1>
          <p className="text-zinc-400 mt-1 text-sm">Track merchant onboarding progress for Closed Won accounts.</p>
        </div>

        {isLoading && <p className="text-zinc-500">Loading...</p>}
        {!isLoading && records?.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <Target className="w-12 h-12 mx-auto mb-3" />
            <p>No onboarding records yet. Closed Won leads will appear here.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {records?.map(record => {
            const { completed, total, pct } = getProgress(record);
            const isComplete = completed === total;

            return (
              <Card key={record.id} className={cn("border", isComplete ? "bg-green-950/20 border-green-800/30" : "bg-zinc-950 border-zinc-800")} data-testid={`onboarding-card-${record.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-base font-semibold">{record.merchantName}</CardTitle>
                    {isComplete ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Complete</Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{pct}%</Badge>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isComplete ? "bg-green-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{completed}/{total} steps completed</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {STEPS.map(step => (
                    <div key={step.key} className="flex items-center gap-3" data-testid={`step-${record.id}-${step.key}`}>
                      <Checkbox
                        checked={record[step.key]}
                        onCheckedChange={v => toggleStep(record as OnboardingRecord, step.key, !!v)}
                        className="border-zinc-600 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        data-testid={`checkbox-${record.id}-${step.key}`}
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {record[step.key] ? (
                          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-600 shrink-0" />
                        )}
                        <span className={cn("text-sm", record[step.key] ? "text-zinc-400 line-through" : "text-zinc-200")}>
                          {step.label}
                        </span>
                      </div>
                    </div>
                  ))}
                  {record.notes && (
                    <p className="text-xs text-zinc-500 mt-3 border-t border-zinc-800 pt-3">{record.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SidebarLayout>
  );
}
