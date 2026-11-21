import React, { useState } from 'react';
import { CarFront, History, Plus } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { formatCurrency, getStageLabel } from '../../utils/workflow';

export const CustomerVehiclesHistoryPage: React.FC = () => {
  const { session, customers, vehicles, serviceOrders, addVehicle } = useService();
  const activeCustomer =
    customers.find((c) => c.id === session?.customerId) || customers[0];

  const myVehicles = vehicles.filter((v) => v.customerId === activeCustomer?.id);
  const myOrders = serviceOrders.filter((o) => o.customerId === activeCustomer?.id);

  const [showAdd, setShowAdd] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [reg, setReg] = useState('');
  const [mileage, setMileage] = useState('15000');
  const [error, setError] = useState('');

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!activeCustomer) return;
    if (!make.trim() || !model.trim() || !reg.trim()) {
      setError('Make, model, and registration number are required.');
      return;
    }
    await addVehicle({
      customerId: activeCustomer.id,
      make: make.trim(),
      model: model.trim(),
      year: Number(year) || 2024,
      registrationNumber: reg.trim().toUpperCase(),
      mileageKm: Number(mileage) || 0,
    });
    setMake('');
    setModel('');
    setReg('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0A1628]">My Vehicles &amp; Service History</h1>
          <p className="text-sm text-slate-600 mt-1">
            Vehicles linked to {activeCustomer?.name} and complete chronological dealership service records.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAddVehicle} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4" noValidate>
          <h2 className="text-base font-bold text-[#0A1628]">Register a Vehicle to Your Profile</h2>
          {error && (
            <div className="px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Make (e.g. Toyota)"
              aria-label="Vehicle make"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Model (e.g. Camry Hybrid)"
              aria-label="Vehicle model"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year"
              aria-label="Model year"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
            />
            <input
              type="text"
              value={reg}
              onChange={(e) => setReg(e.target.value)}
              placeholder="Plate (CA-9XYZ-101)"
              aria-label="Registration number"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
            />
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="Odometer km"
              aria-label="Odometer kilometers"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold">
              Save Vehicle
            </button>
          </div>
        </form>
      )}

      {/* Vehicles Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {myVehicles.map((v) => (
          <div key={v.id} className="bg-white border border-slate-200 rounded-xl p-6 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#2563EB] font-semibold">
                <CarFront className="w-4 h-4" />
                <span>{v.registrationNumber}</span>
              </div>
              <h2 className="text-lg font-bold text-[#0A1628]">
                {v.year} {v.make} {v.model}
              </h2>
              <p className="text-xs text-slate-500">
                {v.color || 'OEM Finish'} · {(v.mileageKm || 0).toLocaleString()} km
              </p>
              {v.vin && <p className="text-[11px] font-mono-tabular text-slate-400">VIN: {v.vin}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">Health Index</p>
              <p className="text-2xl font-bold font-mono-tabular text-emerald-700 mt-0.5">
                {v.healthScore ?? 90}%
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Complete Service History */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <History className="w-4 h-4 text-[#0A1628]" />
          <h2 className="text-base font-bold text-[#0A1628]">Service History ({myOrders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">RO ID</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Summary &amp; Technician</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {myOrders.map((ro) => (
                <tr key={ro.id}>
                  <td className="py-3.5 px-6 font-mono-tabular font-semibold text-[#0A1628] whitespace-nowrap">
                    {ro.orderNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0A1628]">{ro.vehicleLabel}</p>
                    <p className="text-xs text-slate-400">{ro.registrationNumber}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 max-w-md">
                    <p>{ro.reportedIssues}</p>
                    <p className="text-slate-400 mt-0.5">Technician: {ro.technicianName || 'Assigned'}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold text-[#2563EB] whitespace-nowrap">
                    {getStageLabel(ro.stage)}
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
    </div>
  );
};
