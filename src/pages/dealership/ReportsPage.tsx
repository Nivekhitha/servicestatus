import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useService } from '../../context/ServiceContext';
import { computeDashboardMetrics, computeSustainabilityMetrics, formatCurrency } from '../../utils/workflow';

const TURNAROUND_TREND = [
  { month: 'Jul', avgHours: 6.4, csat: 4.6 },
  { month: 'Aug', avgHours: 5.9, csat: 4.7 },
  { month: 'Sep', avgHours: 5.3, csat: 4.8 },
  { month: 'Oct', avgHours: 4.8, csat: 4.85 },
  { month: 'Nov', avgHours: 4.4, csat: 4.91 },
];

export const ReportsPage: React.FC = () => {
  const { employees, serviceOrders, approvalRequests, appointments, circularParts } = useService();

  const metrics = computeDashboardMetrics(
    serviceOrders,
    employees,
    approvalRequests,
    appointments.length
  );
  const sustainability = computeSustainabilityMetrics(circularParts);

  const techData = employees
    .filter((e) => e.role === 'technician')
    .map((t) => ({
      name: t.name,
      completedJobs: t.completedJobs,
      rating: t.averageRating,
      activeJobs: serviceOrders.filter((o) => o.technicianId === t.id && o.stage !== 'ready_for_pickup').length,
    }));

  const approvedRevenue = approvalRequests
    .filter((a) => a.status === 'approved')
    .reduce((sum, a) => sum + a.estimatedCost, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628]">Service Analytics &amp; Operational Reports</h2>
        <p className="text-sm text-slate-600 mt-1">
          Technician productivity, average repair completion time, customer satisfaction trends, and circular parts reuse metrics.
        </p>
      </div>

      {/* Top Report KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Avg. Repair Turnaround</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#0A1628] mt-1">4.4 hrs</p>
          <p className="text-xs text-emerald-700 mt-1">-31% vs. July baseline</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Customer Satisfaction (CSAT)</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#0A1628] mt-1">
            {metrics.customerSatisfaction.toFixed(2)} / 5.0
          </p>
          <p className="text-xs text-slate-500 mt-1">Across rated repair orders</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Approved Supplementary Work</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#2563EB] mt-1">
            {formatCurrency(approvedRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Evidence-backed digital approvals</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Circular Parts CO2 Avoided</p>
          <p className="text-2xl font-bold font-mono-tabular text-emerald-700 mt-1">
            {sustainability.totalCo2SavedKg} kg
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatCurrency(sustainability.totalCreditsIssued)} credits issued
          </p>
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0A1628] mb-1">Average Repair Completion Time (Hours)</h3>
          <p className="text-xs text-slate-500 mb-5">Monthly bay turnaround speed after digital approval adoption</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={TURNAROUND_TREND} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 8]} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="avgHours"
                  name="Avg Hours"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#2563EB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-sm font-bold text-[#0A1628] mb-1">Technician Productivity Comparison</h3>
          <p className="text-xs text-slate-500 mb-5">Closed service orders per technician</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="completedJobs" name="Completed Jobs" fill="#0A1628" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Technician Scorecard Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-[#0A1628]">Technician Productivity &amp; CSAT Breakdown</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
              <th className="py-3 px-6">Technician</th>
              <th className="py-3 px-4 text-right">Active Bays</th>
              <th className="py-3 px-4 text-right">Completed Jobs</th>
              <th className="py-3 px-6 text-right">Customer Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {techData.map((row) => (
              <tr key={row.name}>
                <td className="py-3.5 px-6 font-semibold text-[#0A1628]">{row.name}</td>
                <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-600">{row.activeJobs}</td>
                <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#0A1628]">
                  {row.completedJobs}
                </td>
                <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-emerald-700">
                  {row.rating.toFixed(2)} / 5.0
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
