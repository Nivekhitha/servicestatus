import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyApprovalDecisionToOrder,
  buildNotificationTemplate,
  computeDashboardMetrics,
  computeNewTechnicianRating,
  computeSustainabilityMetrics,
  getStageIndex,
  isSafetyCriticalPart,
  isValidDocumentId,
  recalculateOrderTotals,
} from './workflow';
import type { ApprovalRequest, CircularPart, Employee, ServiceOrder } from '../types/domain';

const baseOrder: ServiceOrder = {
  id: 'ro_101',
  orderNumber: 'RO-2026-101',
  customerId: 'cust_1',
  customerName: 'Ananya Rao',
  preferredLanguage: 'en',
  vehicleId: 'veh_1',
  vehicleLabel: '2023 Volvo XC60',
  registrationNumber: 'TN-09-CR-4821',
  priority: 'high',
  stage: 'waiting_for_approval',
  stageIndex: 4,
  reportedIssues: 'Brake squeal on deceleration',
  estimatedCompletion: 'Today, 5:30 PM',
  isDelayed: false,
  baseEstimate: 240,
  approvedExtrasTotal: 0,
  totalCost: 240,
  costBreakdown: [
    { id: 'c1', label: 'Multi-Point Inspection & Brake Service', category: 'labor', amount: 240 },
  ],
  checklist: [],
  technicalNotes: [],
  customerUpdates: [],
  media: [],
  maintenanceRecommendations: [],
  createdAt: '2026-11-21T08:00:00Z',
  updatedAt: '2026-11-21T09:00:00Z',
};

const pendingApproval: ApprovalRequest = {
  id: 'apr_1',
  serviceOrderId: 'ro_101',
  orderNumber: 'RO-2026-101',
  customerId: 'cust_1',
  technicianName: 'Arjun Menon',
  title: 'Front Brake Rotor Replacement',
  description: 'Measured rotor thickness at 24.1mm (below 25.0mm service spec).',
  estimatedCost: 380,
  status: 'pending',
  createdAt: '2026-11-21T09:15:00Z',
  updatedAt: '2026-11-21T09:15:00Z',
};

test('recalculateOrderTotals sums base estimate and approved extras accurately', () => {
  const result = recalculateOrderTotals(240, [
    { id: '1', label: 'Base', category: 'labor', amount: 240 },
    { id: '2', label: 'Extra A', category: 'additional_approved', amount: 185.5 },
    { id: '3', label: 'Extra B', category: 'additional_approved', amount: 64.5 },
  ]);
  assert.equal(result.baseEstimate, 240);
  assert.equal(result.approvedExtrasTotal, 250);
  assert.equal(result.totalCost, 490);
});

test('applyApprovalDecisionToOrder updates cost breakdown and advances stage on approval', () => {
  const updated = applyApprovalDecisionToOrder(baseOrder, pendingApproval, 'approved');
  assert.equal(updated.approvedExtrasTotal, 380);
  assert.equal(updated.totalCost, 620);
  assert.equal(updated.stage, 'repair_in_progress');
  assert.equal(updated.stageIndex, getStageIndex('repair_in_progress'));
  assert.equal(updated.costBreakdown.length, 2);
});

test('applyApprovalDecisionToOrder preserves base cost on decline and resumes repair', () => {
  const updated = applyApprovalDecisionToOrder(baseOrder, pendingApproval, 'declined');
  assert.equal(updated.approvedExtrasTotal, 0);
  assert.equal(updated.totalCost, 240);
  assert.equal(updated.stage, 'repair_in_progress');
});

test('applyApprovalDecisionToOrder rejects re-mutating an already resolved request', () => {
  assert.throws(
    () =>
      applyApprovalDecisionToOrder(
        baseOrder,
        { ...pendingApproval, status: 'declined' },
        'approved'
      ),
    /already been finalized/
  );
});

test('isSafetyCriticalPart blocks airbags, brake calipers, steering racks, and seatbelts', () => {
  assert.equal(isSafetyCriticalPart('Driver Side Airbag Module', 'Interior Trim & Panels'), true);
  assert.equal(isSafetyCriticalPart('Front Brake Caliper', 'Brake System & Calipers'), true);
  assert.equal(isSafetyCriticalPart('Steering Rack Assembly', 'Steering Column & Rack'), true);
  assert.equal(isSafetyCriticalPart('LED Matrix Headlamp Assembly', 'Exterior Lighting & Headlamps'), false);
  assert.equal(isSafetyCriticalPart('OEM 150A Alternator', 'Alternators & Starters'), false);
});

test('computeDashboardMetrics computes KPIs accurately across orders, technicians, and approvals', () => {
  const employees: Employee[] = [
    {
      id: 'emp_1',
      employeeCode: 'TECH-01',
      name: 'Arjun Menon',
      email: 'arjun@dealership.com',
      phone: '+15550001',
      role: 'technician',
      designation: 'Master Technician',
      department: 'Powertrain',
      skills: ['Diagnostics'],
      availability: 'available',
      activeJobCount: 1,
      completedJobs: 42,
      averageRating: 4.9,
      ratingCount: 30,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];
  const completedOrder: ServiceOrder = {
    ...baseOrder,
    id: 'ro_102',
    stage: 'ready_for_pickup',
    stageIndex: 6,
    customerRating: 5,
  };
  const delayedOrder: ServiceOrder = {
    ...baseOrder,
    id: 'ro_103',
    stage: 'diagnosis',
    stageIndex: 2,
    isDelayed: true,
  };
  const metrics = computeDashboardMetrics(
    [baseOrder, completedOrder, delayedOrder],
    employees,
    [pendingApproval],
    4
  );
  assert.equal(metrics.totalActiveOrders, 2);
  assert.equal(metrics.completedJobs, 1);
  assert.equal(metrics.delayedRepairs, 1);
  assert.equal(metrics.pendingApprovals, 1);
  assert.equal(metrics.availableTechnicians, 1);
  assert.equal(metrics.todaysAppointments, 4);
  assert.equal(metrics.customerSatisfaction, 5);
});

test('computeSustainabilityMetrics aggregates credits and CO2 saved', () => {
  const parts: CircularPart[] = [
    {
      id: 'cp_1',
      partName: 'OEM Headlamp',
      category: 'Exterior Lighting & Headlamps',
      isSafetyCritical: false,
      condition: 'excellent',
      compatibleModels: 'Volvo XC60',
      dealershipName: 'Apex Motors',
      creditValue: 180,
      co2SavedKg: 24,
      status: 'exchanged',
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    },
    {
      id: 'cp_2',
      partName: 'Infotainment Screen',
      category: 'Infotainment & Display Modules',
      isSafetyCritical: false,
      condition: 'refurbished',
      compatibleModels: 'BMW 3 Series',
      dealershipName: 'Apex Motors',
      creditValue: 220,
      co2SavedKg: 30,
      status: 'requested',
      createdAt: '2026-11-20T00:00:00Z',
      updatedAt: '2026-11-20T00:00:00Z',
    },
  ];
  const stats = computeSustainabilityMetrics(parts);
  assert.equal(stats.eligibleCount, 2);
  assert.equal(stats.exchangedCount, 1);
  assert.equal(stats.requestedCount, 1);
  assert.equal(stats.totalCreditsIssued, 180);
  assert.equal(stats.totalCo2SavedKg, 36);
});

test('computeNewTechnicianRating updates rolling average cleanly', () => {
  const res = computeNewTechnicianRating(4.8, 4, 5);
  assert.equal(res.ratingCount, 5);
  assert.equal(res.averageRating, 4.84);
});

test('isValidDocumentId enforces Firestore rule regex and size limits', () => {
  assert.equal(isValidDocumentId('ro_2026-101'), true);
  assert.equal(isValidDocumentId('../hack'), false);
  assert.equal(isValidDocumentId('a'.repeat(129)), false);
});

test('buildNotificationTemplate includes ETA and order number', () => {
  const msg = buildNotificationTemplate('ready', {
    customerName: 'Ananya',
    vehicleLabel: '2023 Volvo XC60',
    orderNumber: 'RO-2026-101',
    stageLabel: 'Ready for Pickup',
    estimatedCompletion: 'Today, 5:30 PM',
  });
  assert.match(msg, /RO-2026-101/);
  assert.match(msg, /Today, 5:30 PM/);
});
