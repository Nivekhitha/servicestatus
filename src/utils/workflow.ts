import {
  ApprovalRequest,
  CircularPart,
  CostItem,
  Employee,
  REPAIR_STAGES,
  RepairStage,
  SAFETY_CRITICAL_CATEGORIES,
  ServiceOrder,
} from '../types/domain';

export function getStageIndex(stage: RepairStage): number {
  const found = REPAIR_STAGES.find((s) => s.key === stage);
  return found ? found.index : 0;
}

export function getStageLabel(stage: RepairStage): string {
  const found = REPAIR_STAGES.find((s) => s.key === stage);
  return found ? found.label : 'Vehicle Received';
}

export function recalculateOrderTotals(
  baseEstimate: number,
  costBreakdown: CostItem[]
): { baseEstimate: number; approvedExtrasTotal: number; totalCost: number } {
  const safeBase = Math.max(0, Math.round(baseEstimate * 100) / 100);
  const approvedExtras = costBreakdown
    .filter((item) => item.category === 'additional_approved')
    .reduce((sum, item) => sum + Math.max(0, item.amount), 0);
  const roundedExtras = Math.round(approvedExtras * 100) / 100;
  return {
    baseEstimate: safeBase,
    approvedExtrasTotal: roundedExtras,
    totalCost: Math.round((safeBase + roundedExtras) * 100) / 100,
  };
}

export function applyApprovalDecisionToOrder(
  order: ServiceOrder,
  request: ApprovalRequest,
  decision: 'approved' | 'declined'
): ServiceOrder {
  if (request.status !== 'pending') {
    throw new Error('Approval request has already been finalized.');
  }

  let nextBreakdown = [...order.costBreakdown];
  if (decision === 'approved') {
    const alreadyExists = nextBreakdown.some((item) => item.id === `apr_${request.id}`);
    if (!alreadyExists) {
      nextBreakdown.push({
        id: `apr_${request.id}`,
        label: request.title,
        category: 'additional_approved',
        amount: request.estimatedCost,
      });
    }
  }

  const totals = recalculateOrderTotals(order.baseEstimate, nextBreakdown);
  const nextStage: RepairStage =
    order.stage === 'waiting_for_approval' ? 'repair_in_progress' : order.stage;

  return {
    ...order,
    costBreakdown: nextBreakdown.slice(0, 20),
    approvedExtrasTotal: totals.approvedExtrasTotal,
    totalCost: totals.totalCost,
    stage: nextStage,
    stageIndex: getStageIndex(nextStage),
    updatedAt: new Date().toISOString(),
  };
}

export function isSafetyCriticalPart(partName: string, category: string): boolean {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedName = partName.trim().toLowerCase();

  if (
    SAFETY_CRITICAL_CATEGORIES.some((cat) => cat.toLowerCase() === normalizedCategory)
  ) {
    return true;
  }

  const bannedKeywords = [
    'airbag',
    'srs',
    'brake caliper',
    'brake pad',
    'brake rotor',
    'brake line',
    'master cylinder',
    'steering rack',
    'steering column',
    'tie rod',
    'seatbelt',
    'pretensioner',
    'abs sensor',
    'control arm',
    'ball joint',
  ];

  return bannedKeywords.some(
    (keyword) => normalizedName.includes(keyword) || normalizedCategory.includes(keyword)
  );
}

export function computeDashboardMetrics(
  orders: ServiceOrder[],
  employees: Employee[],
  approvals: ApprovalRequest[],
  appointmentsCount: number
) {
  const activeOrders = orders.filter((o) => o.stage !== 'ready_for_pickup');
  const inRepair = orders.filter((o) =>
    ['inspection', 'diagnosis', 'repair_in_progress', 'waiting_for_approval'].includes(o.stage)
  );
  const completedOrders = orders.filter((o) =>
    ['repair_completed', 'ready_for_pickup'].includes(o.stage)
  );
  const delayedOrders = orders.filter((o) => o.isDelayed && o.stage !== 'ready_for_pickup');
  const pendingApprovals = approvals.filter((a) => a.status === 'pending');
  const availableTechs = employees.filter(
    (e) => e.role === 'technician' && e.isActive && e.availability === 'available'
  );

  const ratedOrders = orders.filter(
    (o) => typeof o.customerRating === 'number' && o.customerRating >= 1
  );
  const avgSatisfaction =
    ratedOrders.length > 0
      ? Math.round(
          (ratedOrders.reduce((acc, o) => acc + (o.customerRating || 0), 0) / ratedOrders.length) *
            10
        ) / 10
      : 4.8;

  return {
    totalActiveOrders: activeOrders.length,
    vehiclesUnderRepair: inRepair.length,
    completedJobs: completedOrders.length,
    pendingJobs: activeOrders.length,
    todaysAppointments: appointmentsCount,
    availableTechnicians: availableTechs.length,
    delayedRepairs: delayedOrders.length,
    pendingApprovals: pendingApprovals.length,
    customerSatisfaction: avgSatisfaction,
    ratedCount: ratedOrders.length,
  };
}

export function computeSustainabilityMetrics(parts: CircularPart[]) {
  const eligibleCount = parts.filter((p) => !p.isSafetyCritical).length;
  const exchangedParts = parts.filter((p) => p.status === 'exchanged');
  const totalCo2SavedKg = Math.round(
    parts.reduce((acc, p) => acc + (p.status === 'exchanged' ? p.co2SavedKg : p.co2SavedKg * 0.4), 0)
  );
  const totalCreditsIssued = exchangedParts.reduce((acc, p) => acc + p.creditValue, 0);
  const requestedCount = parts.filter((p) => p.status === 'requested').length;

  return {
    eligibleCount,
    exchangedCount: exchangedParts.length,
    requestedCount,
    totalCo2SavedKg,
    totalCreditsIssued,
  };
}

export function computeNewTechnicianRating(
  currentAvg: number,
  currentCount: number,
  newRating: number
): { averageRating: number; ratingCount: number } {
  const clamped = Math.min(5, Math.max(1, Math.round(newRating)));
  const nextCount = currentCount + 1;
  const nextAvg = Math.round(((currentAvg * currentCount + clamped) / nextCount) * 100) / 100;
  return { averageRating: nextAvg, ratingCount: nextCount };
}

export function isValidDocumentId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(id);
}

export function buildNotificationTemplate(
  templateType: 'progress' | 'approval' | 'delay' | 'ready' | 'appointment',
  params: {
    customerName: string;
    vehicleLabel: string;
    orderNumber: string;
    stageLabel: string;
    estimatedCompletion: string;
    extraDetail?: string;
  }
): string {
  const { customerName, vehicleLabel, orderNumber, stageLabel, estimatedCompletion, extraDetail } =
    params;

  switch (templateType) {
    case 'progress':
      return `Hi ${customerName}, your ${vehicleLabel} (RO ${orderNumber}) is now in "${stageLabel}". Estimated completion: ${estimatedCompletion}. View live inspection photos in Service Status Companion.`;
    case 'approval':
      return `Hi ${customerName}, our technician identified an additional recommended repair for your ${vehicleLabel} (RO ${orderNumber})${extraDetail ? `: ${extraDetail}` : ''}. Please review evidence and approve or decline in your Customer Portal. Current ETA: ${estimatedCompletion}.`;
    case 'delay':
      return `Hi ${customerName}, we want to update you on your ${vehicleLabel} (RO ${orderNumber}). There is a schedule revision${extraDetail ? ` due to ${extraDetail}` : ''}. Updated estimated completion: ${estimatedCompletion}.`;
    case 'ready':
      return `Hi ${customerName}, great news! Your ${vehicleLabel} (RO ${orderNumber}) has passed final quality checks and is Ready for Pickup. Handover ETA: ${estimatedCompletion}.`;
    case 'appointment':
      return `Hi ${customerName}, your service appointment for ${vehicleLabel} is confirmed for ${estimatedCompletion}. We look forward to welcoming you at the service bay.`;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}
