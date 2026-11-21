import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2, Leaf, Plus, ShieldAlert } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { ASSET_URLS } from '../../data/seedData';
import {
  ELIGIBLE_CIRCULAR_CATEGORIES,
  SAFETY_CRITICAL_CATEGORIES,
  type CircularPart,
} from '../../types/domain';
import { computeSustainabilityMetrics, formatCurrency, isSafetyCriticalPart } from '../../utils/workflow';
import { SafeImage } from '../../components/SafeImage';

export const PartsExchangePage: React.FC = () => {
  const {
    circularParts,
    customers,
    addCircularPart,
    requestCircularPart,
    completeCircularPartExchange,
  } = useService();

  const [showForm, setShowForm] = useState(false);
  const [partName, setPartName] = useState('');
  const [category, setCategory] = useState<string>(ELIGIBLE_CIRCULAR_CATEGORIES[0]);
  const [condition, setCondition] = useState<CircularPart['condition']>('refurbished');
  const [compatibleModels, setCompatibleModels] = useState('');
  const [dealershipName, setDealershipName] = useState('Apex Pacific Motors — San Jose');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [creditValue, setCreditValue] = useState('150');
  const [co2SavedKg, setCo2SavedKg] = useState('25');
  const [sourceCustomerId, setSourceCustomerId] = useState(customers[0]?.id || '');
  const [formError, setFormError] = useState('');

  const [requestingPartId, setRequestingPartId] = useState<string | null>(null);
  const [partnerDealerName, setPartnerDealerName] = useState('Bayshore European Service — Oakland');

  const stats = computeSustainabilityMetrics(circularParts);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!partName.trim() || !compatibleModels.trim()) {
      setFormError('Part name and compatible vehicle models are required.');
      return;
    }
    if (isSafetyCriticalPart(partName, category)) {
      setFormError(
        'Blocked: Safety-critical components (airbags, brakes, steering, seatbelts, ABS/structural suspension) are permanently excluded from Circular Parts Exchange.'
      );
      return;
    }

    try {
      await addCircularPart({
        partName,
        category,
        condition,
        compatibleModels,
        dealershipName,
        inspectionNotes,
        imageUrl: ASSET_URLS.circularPartAlternator,
        creditValue: Number(creditValue) || 100,
        co2SavedKg: Number(co2SavedKg) || 15,
        sourceCustomerId: sourceCustomerId || undefined,
      });
      setPartName('');
      setCompatibleModels('');
      setInspectionNotes('');
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to list part.');
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingPartId || !partnerDealerName.trim()) return;
    await requestCircularPart(requestingPartId, partnerDealerName);
    setRequestingPartId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Circular Parts Exchange</h2>
          <p className="text-sm text-slate-600 mt-1">
            Recover, inspect, and redistribute eligible non-safety OEM parts across partner dealerships while crediting participating customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          List Eligible Part
        </button>
      </div>

      {/* Sustainability Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Eligible OEM Parts Listed</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#0A1628] mt-1.5">{stats.eligibleCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Inter-Dealer Transfers Completed</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#2563EB] mt-1.5">{stats.exchangedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Service Credits Issued</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#0A1628] mt-1.5">
            {formatCurrency(stats.totalCreditsIssued)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Estimated CO2 Avoided</p>
            <Leaf className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono-tabular text-emerald-700 mt-1.5">
            {stats.totalCo2SavedKg} kg
          </p>
        </div>
      </section>

      {/* Safety-Critical Compliance Notice */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl px-5 py-3.5 flex items-start gap-3 text-xs text-slate-700">
        <ShieldAlert className="w-4 h-4 text-[#0A1628] mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong className="font-semibold text-[#0A1628]">Safety-Critical Exclusion Enforced:</strong>{' '}
          {SAFETY_CRITICAL_CATEGORIES.join(', ')} are blocked at both UI validation and Firestore security rules level.
        </p>
      </div>

      {/* List Part Form */}
      {showForm && (
        <form onSubmit={handleCreatePart} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4" noValidate>
          <h3 className="text-base font-bold text-[#0A1628]">List Inspected Reusable Component</h3>
          {formError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cp-name" className="block text-xs font-semibold text-slate-700 mb-1">Part Name</label>
              <input
                id="cp-name"
                type="text"
                value={partName}
                onChange={(e) => setPartName(e.target.value)}
                placeholder="e.g. OEM Heated Side Mirror Assembly"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cp-cat" className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                id="cp-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <optgroup label="Eligible Non-Safety Categories">
                  {ELIGIBLE_CIRCULAR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </optgroup>
                <optgroup label="Excluded Safety-Critical (Blocked)">
                  {SAFETY_CRITICAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c} (Excluded)</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label htmlFor="cp-cond" className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
              <select
                id="cp-cond"
                value={condition}
                onChange={(e) => setCondition(e.target.value as CircularPart['condition'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="excellent">Excellent</option>
                <option value="refurbished">Refurbished &amp; Bench-Tested</option>
                <option value="good">Good</option>
              </select>
            </div>
            <div>
              <label htmlFor="cp-models" className="block text-xs font-semibold text-slate-700 mb-1">Compatible Models</label>
              <input
                id="cp-models"
                type="text"
                value={compatibleModels}
                onChange={(e) => setCompatibleModels(e.target.value)}
                placeholder="e.g. Volvo XC60 2021-2024"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cp-credit" className="block text-xs font-semibold text-slate-700 mb-1">Customer Credit (USD)</label>
              <input
                id="cp-credit"
                type="number"
                min={0}
                value={creditValue}
                onChange={(e) => setCreditValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
              />
            </div>
            <div>
              <label htmlFor="cp-co2" className="block text-xs font-semibold text-slate-700 mb-1">Est. CO2 Saved (kg)</label>
              <input
                id="cp-co2"
                type="number"
                min={1}
                value={co2SavedKg}
                onChange={(e) => setCo2SavedKg(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cp-cust" className="block text-xs font-semibold text-slate-700 mb-1">Credit Recipient Customer</label>
              <select
                id="cp-cust"
                value={sourceCustomerId}
                onChange={(e) => setSourceCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cp-dealer" className="block text-xs font-semibold text-slate-700 mb-1">Originating Dealership</label>
              <input
                id="cp-dealer"
                type="text"
                value={dealershipName}
                onChange={(e) => setDealershipName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cp-notes" className="block text-xs font-semibold text-slate-700 mb-1">Inspection &amp; Bench Test Details</label>
            <textarea
              id="cp-notes"
              rows={2}
              value={inspectionNotes}
              onChange={(e) => setInspectionNotes(e.target.value)}
              placeholder="Document test voltages, seals, cosmetic grade, and OEM serial verification..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold">
              Publish Part Listing
            </button>
          </div>
        </form>
      )}

      {/* Parts Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {circularParts.map((part) => (
          <div key={part.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
            <div>
              <div className="h-44 bg-slate-100">
                <SafeImage src={part.imageUrl} alt={part.partName} className="w-full h-full object-cover" />
              </div>
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500">{part.category}</span>
                  <span
                    className={`font-semibold capitalize ${
                      part.status === 'exchanged'
                        ? 'text-emerald-700'
                        : part.status === 'requested'
                          ? 'text-[#6366F1]'
                          : 'text-[#2563EB]'
                    }`}
                  >
                    {part.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0A1628]">{part.partName}</h3>
                <p className="text-xs text-slate-600">
                  Fits: <span className="font-medium text-[#0A1628]">{part.compatibleModels}</span>
                </p>
                <p className="text-xs text-slate-500 capitalize">
                  Condition: {part.condition} · Credit: {formatCurrency(part.creditValue)} · {part.co2SavedKg} kg CO2
                </p>
                {part.inspectionNotes && (
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
                    {part.inspectionNotes}
                  </p>
                )}
                {part.requestedByDealership && (
                  <p className="text-xs text-[#6366F1] font-medium pt-1">
                    Partner request: {part.requestedByDealership}
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate">{part.dealershipName}</span>
              {part.status === 'available' && (
                <button
                  type="button"
                  onClick={() => setRequestingPartId(part.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Request Transfer
                </button>
              )}
              {part.status === 'requested' && (
                <button
                  type="button"
                  onClick={() => completeCircularPartExchange(part.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete &amp; Credit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Partner Request Modal */}
      {requestingPartId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1628]/50 p-4" role="dialog" aria-modal="true">
          <form onSubmit={handleRequestTransfer} className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0A1628]">Request Inter-Dealership Part Transfer</h3>
            <div>
              <label htmlFor="partner-dealer" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Requesting Dealership Name
              </label>
              <input
                id="partner-dealer"
                type="text"
                required
                value={partnerDealerName}
                onChange={(e) => setPartnerDealerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRequestingPartId(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold">
                Submit Request
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
