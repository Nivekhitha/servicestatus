import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useService } from '../../context/ServiceContext';
import { formatCurrency } from '../../utils/workflow';
import { SafeImage } from '../../components/SafeImage';

export const ApprovalsPage: React.FC = () => {
  const { approvalRequests } = useService();
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');

  const filtered = approvalRequests.filter((a) =>
    statusFilter === 'all' ? true : a.status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Additional Repair Approvals</h2>
          <p className="text-sm text-slate-600 mt-1">
            Monitor customer authorizations on supplementary technician findings. Decisions sync live to repair order totals.
          </p>
        </div>
        <Link
          to="/dealership/technician"
          className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#4F46E5] whitespace-nowrap shrink-0"
        >
          Create Request in Tech Bay
        </Link>
      </div>

      <div className="inline-flex p-1 bg-slate-200/70 rounded-lg">
        {(['all', 'pending', 'approved', 'declined'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold capitalize ${
              statusFilter === s ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600'
            }`}
          >
            {s} ({s === 'all' ? approvalRequests.length : approvalRequests.filter((a) => a.status === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
          No approval requests in this status category.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((apr) => (
            <div key={apr.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              {apr.mediaUrl && (
                <div className="h-44 bg-[#0A1628]">
                  <SafeImage src={apr.mediaUrl} alt={apr.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono-tabular font-semibold text-[#2563EB]">{apr.orderNumber}</span>
                    <span
                      className={`font-semibold capitalize ${
                        apr.status === 'approved'
                          ? 'text-emerald-700'
                          : apr.status === 'declined'
                            ? 'text-red-600'
                            : 'text-[#6366F1]'
                      }`}
                    >
                      {apr.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0A1628] mt-1.5">{apr.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{apr.description}</p>
                  {apr.customerResponseNote && (
                    <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      Customer response: &ldquo;{apr.customerResponseNote}&rdquo;
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Submitted by {apr.technicianName}</span>
                  <span className="text-base font-bold font-mono-tabular text-[#0A1628]">
                    {formatCurrency(apr.estimatedCost)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
