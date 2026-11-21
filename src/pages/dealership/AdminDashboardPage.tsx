import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  Star,
  Wrench,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useService } from '../../context/ServiceContext';
import { REPAIR_STAGES } from '../../types/domain';
import { computeDashboardMetrics, formatCurrency, getStageLabel } from '../../utils/workflow';

export const AdminDashboardPage: React.FC = () => {
  const { serviceOrders, employees, approvalRequests, appointments } = useService();

  const metrics = computeDashboardMetrics(
    serviceOrders,
    employees,
    approvalRequests,
    appointments.filter((a) => a.status !== 'cancelled').length
  );

  const stageDistribution = REPAIR_STAGES.map((st) => ({
    stage: st.shortLabel,
    orders: serviceOrders.filter((o) => o.stage === st.key).length,
  }));

  const technicianPerformance = employees
    .filter((e) => e.role === 'technician' && e.isActive)
    .map((e) => ({
      name: e.name.split(' ')[0],
      completed: e.completedJobs,
      active: e.activeJobCount,
      rating: e.averageRating,
    }));

  const delayedOrders = serviceOrders.filter((o) => o.isDelayed && o.stage !== 'ready_for_pickup');
  const pendingApprovals = approvalRequests.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Service Operations Overview</h2>
          <p className="text-sm text-slate-600 mt-1">
            Live bay throughput, technician utilization, pending customer authorizations, and handover performance.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/dealership/advisor"
            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
          >
            New Repair Order
          </Link>
          <Link
            to="/dealership/reports"
            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-[#0A1628] text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Full Reports
          </Link>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <section aria-label="Dealership performance metrics" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Total Active Service Orders</p>
          <p className="text-3xl font-bold text-[#0A1628] font-mono-tabular mt-2">
            {metrics.totalActiveOrders}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.vehiclesUnderRepair} vehicles under repair · {metrics.pendingJobs} pending handover
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Completed Jobs &amp; Appointments</p>
          <p className="text-3xl font-bold text-[#0A1628] font-mono-tabular mt-2">
            {metrics.completedJobs}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.todaysAppointments} active appointments scheduled
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Pending Approvals &amp; Delays</p>
          <p className="text-3xl font-bold text-[#6366F1] font-mono-tabular mt-2">
            {metrics.pendingApprovals}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.delayedRepairs} delayed {metrics.delayedRepairs === 1 ? 'repair' : 'repairs'} requiring ETA follow-up
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Customer Satisfaction &amp; Staff</p>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-[#0A1628] font-mono-tabular">
              {metrics.customerSatisfaction.toFixed(1)}
            </p>
            <span className="text-xs text-slate-500">/ 5.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {metrics.availableTechnicians} available {metrics.availableTechnicians === 1 ? 'technician' : 'technicians'} on shift
          </p>
        </div>
      </section>

      {/* Alerts Strip (Delayed Repairs & Pending Approvals) */}
      {(delayedOrders.length > 0 || pendingApprovals.length > 0) && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-[#0A1628]">Delayed Repairs ({delayedOrders.length})</h3>
              </div>
              <Link to="/dealership/service-orders" className="text-xs font-semibold text-[#2563EB] hover:underline">
                Manage Orders
              </Link>
            </div>
            {delayedOrders.length === 0 ? (
              <p className="text-sm text-slate-500">All active repair orders are currently on schedule.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {delayedOrders.map((ro) => (
                  <li key={ro.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0A1628]">
                        {ro.orderNumber} · {ro.vehicleLabel}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">{ro.delayReason || 'Parts or bay delay flagged.'}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Customer: {ro.customerName} · Revised ETA: {ro.estimatedCompletion}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-amber-700 whitespace-nowrap">Delayed</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#6366F1]" />
                <h3 className="text-sm font-bold text-[#0A1628]">
                  Pending Customer Approvals ({pendingApprovals.length})
                </h3>
              </div>
              <Link to="/dealership/approvals" className="text-xs font-semibold text-[#2563EB] hover:underline">
                Review Queue
              </Link>
            </div>
            {pendingApprovals.length === 0 ? (
              <p className="text-sm text-slate-500">No outstanding approval requests awaiting customer action.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingApprovals.map((apr) => (
                  <li key={apr.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0A1628]">{apr.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {apr.orderNumber} · Recommended by {apr.technicianName}
                      </p>
                    </div>
                    <span className="text-sm font-bold font-mono-tabular text-[#0A1628] whitespace-nowrap">
                      {formatCurrency(apr.estimatedCost)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Charts Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-[#0A1628]">Repair Orders by Service Stage</h3>
              <p className="text-xs text-slate-500 mt-0.5">Current bay load across all seven workflow stages</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageDistribution} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="orders" name="Vehicles" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-[#0A1628]">Technician Completed Jobs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Cumulative closed repair orders by certified bay staff</p>
            </div>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={technicianPerformance} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="completed" name="Completed Jobs" fill="#0A1628" radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Active Repair Orders Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0A1628]">Live Dealership Repair Board</h3>
            <p className="text-xs text-slate-500 mt-0.5">Real-time synchronization with the Customer Portal</p>
          </div>
          <Link
            to="/dealership/service-orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
          >
            All Service Orders
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">RO ID</th>
                <th className="py-3 px-4">Customer &amp; Vehicle</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {serviceOrders.map((ro) => (
                <tr key={ro.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-mono-tabular font-semibold text-[#0A1628] whitespace-nowrap">
                    {ro.orderNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0A1628]">{ro.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {ro.vehicleLabel} · {ro.registrationNumber}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {ro.technicianName || 'Unassigned'}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-xs font-semibold ${
                        ro.stage === 'ready_for_pickup'
                          ? 'text-emerald-700'
                          : ro.stage === 'waiting_for_approval'
                            ? 'text-[#6366F1]'
                            : ro.isDelayed
                              ? 'text-amber-700'
                              : 'text-[#2563EB]'
                      }`}
                    >
                      {getStageLabel(ro.stage)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                    {ro.estimatedCompletion}
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-[#0A1628] whitespace-nowrap">
                    {formatCurrency(ro.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Bottom Summary Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <CalendarClock className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span>{metrics.todaysAppointments} appointments queued for advisor check-in</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{metrics.completedJobs} vehicles passed final quality handover</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{metrics.ratedCount} verified customer ratings logged</span>
        </div>
      </section>
    </div>
  );
};
