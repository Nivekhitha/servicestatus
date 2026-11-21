import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Wrench } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { REPAIR_STAGES, type RepairStage } from '../../types/domain';
import { formatCurrency, getStageLabel } from '../../utils/workflow';
import { StageTimeline } from '../../components/StageTimeline';

export const ServiceOrdersPage: React.FC = () => {
  const { serviceOrders, updateOrderStage } = useService();
  const [stageFilter, setStageFilter] = useState<'all' | RepairStage>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(serviceOrders[0]?.id || '');

  const q = search.trim().toLowerCase();
  const filtered = serviceOrders.filter((ro) => {
    const matchesStage = stageFilter === 'all' || ro.stage === stageFilter;
    const matchesText =
      !q ||
      ro.orderNumber.toLowerCase().includes(q) ||
      ro.customerName.toLowerCase().includes(q) ||
      ro.vehicleLabel.toLowerCase().includes(q) ||
      ro.registrationNumber.toLowerCase().includes(q);
    return matchesStage && matchesText;
  });

  const activeOrder = filtered.find((o) => o.id === selectedId) || filtered[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Service Orders</h2>
          <p className="text-sm text-slate-600 mt-1">
            Inspect active and completed repair orders, advance stages, and verify synchronized customer updates.
          </p>
        </div>
        <Link
          to="/dealership/advisor"
          className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          Open New Repair Order
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              stageFilter === 'all' ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600'
            }`}
          >
            All ({serviceOrders.length})
          </button>
          {REPAIR_STAGES.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStageFilter(st.key)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                stageFilter === st.key ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600'
              }`}
            >
              {st.shortLabel}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RO, customer, plate..."
            aria-label="Search service orders"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">RO Number</th>
                <th className="py-3 px-4">Customer &amp; Vehicle</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">ETA</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No service orders match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((ro) => (
                  <tr
                    key={ro.id}
                    onClick={() => setSelectedId(ro.id)}
                    className={`cursor-pointer transition-colors ${
                      activeOrder?.id === ro.id ? 'bg-[#2563EB]/8' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-6 font-mono-tabular font-semibold text-[#0A1628] whitespace-nowrap">
                      {ro.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[#0A1628]">{ro.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {ro.vehicleLabel} · {ro.registrationNumber}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {ro.technicianName || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-[#2563EB] whitespace-nowrap">
                      {getStageLabel(ro.stage)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {ro.estimatedCompletion}
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-[#0A1628]">
                      {formatCurrency(ro.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Order Live Detail */}
      {activeOrder && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono-tabular font-semibold text-[#2563EB]">
                {activeOrder.orderNumber} · {activeOrder.registrationNumber}
              </p>
              <h3 className="text-lg font-bold text-[#0A1628] mt-0.5">
                {activeOrder.vehicleLabel} — {activeOrder.customerName}
              </h3>
              <p className="text-sm text-slate-600 mt-1">{activeOrder.reportedIssues}</p>
            </div>
            <Link
              to="/dealership/technician"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5" />
              Open in Technician Bay
            </Link>
          </div>

          <StageTimeline
            currentStage={activeOrder.stage}
            interactive
            compact
            onSelectStage={(stage) => updateOrderStage(activeOrder.id, stage)}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">Itemized Cost Breakdown</h4>
              <ul className="divide-y divide-slate-100 text-xs">
                {activeOrder.costBreakdown.map((item) => (
                  <li key={item.id} className="py-2 flex items-center justify-between gap-2">
                    <span className="text-slate-700">{item.label}</span>
                    <span className="font-mono-tabular font-semibold text-[#0A1628]">
                      {formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
                <li className="py-2 flex items-center justify-between font-bold text-[#0A1628]">
                  <span>Total Authorized</span>
                  <span className="font-mono-tabular">{formatCurrency(activeOrder.totalCost)}</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-2">
                Latest Customer-Facing Updates ({activeOrder.customerUpdates.length})
              </h4>
              {activeOrder.customerUpdates.length === 0 ? (
                <p className="text-xs text-slate-400">No updates published yet.</p>
              ) : (
                <ul className="space-y-2.5 text-xs">
                  {activeOrder.customerUpdates.slice(0, 3).map((u) => (
                    <li key={u.id} className="pb-2 border-b border-slate-100 last:border-0">
                      <p className="text-slate-700 leading-relaxed">{u.text}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 uppercase">
                        {u.language} · {u.source}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
