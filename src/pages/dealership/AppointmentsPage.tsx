import React, { useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { useService } from '../../context/ServiceContext';

export const AppointmentsPage: React.FC = () => {
  const {
    customers,
    vehicles,
    employees,
    appointments,
    createAppointment,
    updateAppointmentStatus,
    convertAppointmentToOrder,
  } = useService();

  const technicians = useMemo(
    () => employees.filter((e) => e.role === 'technician' && e.isActive),
    [employees]
  );

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const customerVehicles = useMemo(
    () => vehicles.filter((v) => v.customerId === customerId),
    [vehicles, customerId]
  );
  const [vehicleId, setVehicleId] = useState(customerVehicles[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState('2026-11-22');
  const [scheduledSlot, setScheduledSlot] = useState('10:30 AM');
  const [serviceType, setServiceType] = useState('Periodic Maintenance & Multi-Point Check');
  const [reportedIssues, setReportedIssues] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cust = customers.find((c) => c.id === customerId);
    const veh = vehicles.find((v) => v.id === (vehicleId || customerVehicles[0]?.id));
    if (!cust || !veh) {
      setError('Select a customer with a registered vehicle.');
      return;
    }
    if (!scheduledDate || !serviceType.trim()) {
      setError('Date and service type are required.');
      return;
    }
    await createAppointment({
      customerId: cust.id,
      customerName: cust.name,
      vehicleId: veh.id,
      vehicleLabel: `${veh.year} ${veh.make} ${veh.model}`,
      scheduledDate,
      scheduledSlot,
      serviceType: serviceType.trim(),
      reportedIssues: reportedIssues.trim(),
    });
    setReportedIssues('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628]">Service Appointments</h2>
        <p className="text-sm text-slate-600 mt-1">
          Book customer intake slots, check in arriving vehicles, and convert appointments directly into repair orders.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4" noValidate>
        <h3 className="text-base font-bold text-[#0A1628]">Schedule Customer Appointment</h3>
        {error && (
          <div className="px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="apt-cust" className="block text-xs font-semibold text-slate-700 mb-1">Customer</label>
            <select
              id="apt-cust"
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const match = vehicles.filter((v) => v.customerId === e.target.value);
                setVehicleId(match[0]?.id || '');
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="apt-veh" className="block text-xs font-semibold text-slate-700 mb-1">Vehicle</label>
            <select
              id="apt-veh"
              value={vehicleId || customerVehicles[0]?.id || ''}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {customerVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model} ({v.registrationNumber})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="apt-date" className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
            <input
              id="apt-date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
            />
          </div>
          <div>
            <label htmlFor="apt-slot" className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
            <select
              id="apt-slot"
              value={scheduledSlot}
              onChange={(e) => setScheduledSlot(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="01:00 PM">01:00 PM</option>
              <option value="02:30 PM">02:30 PM</option>
              <option value="04:00 PM">04:00 PM</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="apt-type" className="block text-xs font-semibold text-slate-700 mb-1">Service Type</label>
            <input
              id="apt-type"
              type="text"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="apt-notes" className="block text-xs font-semibold text-slate-700 mb-1">Reported Issues</label>
            <input
              id="apt-notes"
              type="text"
              value={reportedIssues}
              onChange={(e) => setReportedIssues(e.target.value)}
              placeholder="Optional customer notes"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Schedule Appointment
        </button>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Date &amp; Slot</th>
                <th className="py-3 px-4">Customer &amp; Vehicle</th>
                <th className="py-3 px-4">Service Requested</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6 font-mono-tabular text-xs font-semibold text-[#0A1628] whitespace-nowrap">
                    {apt.scheduledDate} · {apt.scheduledSlot}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-[#0A1628]">{apt.customerName}</p>
                    <p className="text-xs text-slate-500">{apt.vehicleLabel}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700">
                    <p className="font-medium">{apt.serviceType}</p>
                    {apt.reportedIssues && <p className="text-slate-400 mt-0.5">{apt.reportedIssues}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-semibold capitalize whitespace-nowrap">
                    <span
                      className={
                        apt.status === 'converted'
                          ? 'text-emerald-700'
                          : apt.status === 'cancelled'
                            ? 'text-slate-400'
                            : 'text-[#2563EB]'
                      }
                    >
                      {apt.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right whitespace-nowrap">
                    {(apt.status === 'scheduled' || apt.status === 'checked_in') && (
                      <div className="inline-flex items-center gap-2">
                        {apt.status === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => updateAppointmentStatus(apt.id, 'checked_in')}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Check In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => convertAppointmentToOrder(apt.id, technicians[0]?.id || '', 235)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744]"
                        >
                          Open RO
                        </button>
                        <button
                          type="button"
                          onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                          className="text-xs font-semibold text-red-600 hover:underline ml-1"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
