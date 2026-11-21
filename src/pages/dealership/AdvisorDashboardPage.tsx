import React, { useMemo, useState } from 'react';
import { Bell, CheckCircle2, Plus, Send, UserCheck } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import type { ServiceOrder } from '../../types/domain';
import { buildNotificationTemplate, formatCurrency, getStageLabel } from '../../utils/workflow';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const AdvisorDashboardPage: React.FC = () => {
  const {
    customers,
    vehicles,
    employees,
    serviceOrders,
    appointments,
    createServiceOrder,
    assignTechnician,
    updateOrderStage,
    updateOrderEtaAndDelay,
    convertAppointmentToOrder,
    sendNotification,
  } = useService();

  const technicians = useMemo(
    () => employees.filter((e) => e.role === 'technician' && e.isActive),
    [employees]
  );

  // Create RO form state
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const customerVehicles = useMemo(
    () => vehicles.filter((v) => v.customerId === customerId),
    [vehicles, customerId]
  );
  const [vehicleId, setVehicleId] = useState(customerVehicles[0]?.id || '');
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id || '');
  const [priority, setPriority] = useState<ServiceOrder['priority']>('standard');
  const [reportedIssues, setReportedIssues] = useState('');
  const [estimatedCompletion, setEstimatedCompletion] = useState('Today, 6:00 PM');
  const [baseEstimate, setBaseEstimate] = useState('250');
  const [formError, setFormError] = useState('');

  // ETA Modal state
  const [etaOrder, setEtaOrder] = useState<ServiceOrder | null>(null);
  const [etaValue, setEtaValue] = useState('');
  const [isDelayedFlag, setIsDelayedFlag] = useState(false);
  const [delayReason, setDelayReason] = useState('');

  // Pickup Confirmation state
  const [pickupTarget, setPickupTarget] = useState<ServiceOrder | null>(null);

  const handleCustomerChange = (nextCustId: string) => {
    setCustomerId(nextCustId);
    const matching = vehicles.filter((v) => v.customerId === nextCustId);
    setVehicleId(matching[0]?.id || '');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const resolvedVehicleId = vehicleId || customerVehicles[0]?.id || '';
    if (!customerId || !resolvedVehicleId) {
      setFormError('Select a customer with a registered vehicle first (add one under Customers or Vehicles).');
      return;
    }
    if (!reportedIssues.trim()) {
      setFormError('Describe the customer-reported vehicle issues.');
      return;
    }
    if (!estimatedCompletion.trim()) {
      setFormError('Provide an initial estimated completion time.');
      return;
    }

    await createServiceOrder({
      customerId,
      vehicleId: resolvedVehicleId,
      technicianId: technicianId || undefined,
      priority,
      reportedIssues,
      estimatedCompletion,
      baseEstimate: Number(baseEstimate) || 0,
    });

    setReportedIssues('');
  };

  const handleConfirmReadyForPickup = async () => {
    if (!pickupTarget) return;
    await updateOrderStage(pickupTarget.id, 'ready_for_pickup');
    const msg = buildNotificationTemplate('ready', {
      customerName: pickupTarget.customerName,
      vehicleLabel: pickupTarget.vehicleLabel,
      orderNumber: pickupTarget.orderNumber,
      stageLabel: 'Ready for Pickup',
      estimatedCompletion: 'Ready Now at Handover Bay',
    });
    await sendNotification({
      serviceOrderId: pickupTarget.id,
      customerId: pickupTarget.customerId,
      recipientName: pickupTarget.customerName,
      recipientContact: pickupTarget.customerPhone,
      channel: 'in_app',
      templateType: 'ready',
      message: msg,
      estimatedCompletion: 'Ready Now',
    });
    setPickupTarget(null);
  };

  const handleSaveEta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!etaOrder || !etaValue.trim()) return;
    await updateOrderEtaAndDelay(etaOrder.id, etaValue, isDelayedFlag, delayReason);
    setEtaOrder(null);
  };

  const openAppointments = appointments.filter((a) => a.status === 'scheduled' || a.status === 'checked_in');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628]">Service Advisor Desk</h2>
        <p className="text-sm text-slate-600 mt-1">
          Open repair orders, dispatch work to available technicians, update estimated completion times, and release vehicles for handover.
        </p>
      </div>

      {/* Top Grid: Create RO Form + Technician Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateOrder}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          noValidate
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#0A1628]">Generate New Repair Order</h3>
            <span className="text-xs text-slate-500">Syncs immediately to Technician &amp; Customer</span>
          </div>

          {formError && (
            <div className="px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ro-customer" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer
              </label>
              <select
                id="ro-customer"
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ro-vehicle" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle
              </label>
              <select
                id="ro-vehicle"
                value={vehicleId || customerVehicles[0]?.id || ''}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                {customerVehicles.length === 0 ? (
                  <option value="">No vehicle registered for this customer</option>
                ) : (
                  customerVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} ({v.registrationNumber})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ro-tech" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Assign Technician
              </label>
              <select
                id="ro-tech"
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.availability})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ro-priority" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Service Priority
              </label>
              <select
                id="ro-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as ServiceOrder['priority'])}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="ro-estimate" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Base Estimate (USD)
              </label>
              <input
                id="ro-estimate"
                type="number"
                min={0}
                value={baseEstimate}
                onChange={(e) => setBaseEstimate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ro-eta" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estimated Completion Time
            </label>
            <input
              id="ro-eta"
              type="text"
              value={estimatedCompletion}
              onChange={(e) => setEstimatedCompletion(e.target.value)}
              placeholder="e.g. Today, 5:30 PM"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <div>
            <label htmlFor="ro-issues" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Customer-Reported Vehicle Issues
            </label>
            <textarea
              id="ro-issues"
              rows={3}
              value={reportedIssues}
              onChange={(e) => setReportedIssues(e.target.value)}
              placeholder="Record symptoms, warning lights, service interval requests, and customer notes..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Repair Order
          </button>
        </form>

        {/* Technician Availability & Open Appointments */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-[#0A1628] mb-4">Technician Availability &amp; Workload</h3>
            <ul className="divide-y divide-slate-100">
              {technicians.map((tech) => {
                const liveActiveCount = serviceOrders.filter(
                  (o) => o.technicianId === tech.id && o.stage !== 'ready_for_pickup'
                ).length;
                return (
                  <li key={tech.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[#0A1628]">{tech.name}</p>
                      <p className="text-xs text-slate-500">
                        {tech.designation} · {tech.skills.slice(0, 2).join(', ')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-semibold capitalize ${
                          tech.availability === 'available'
                            ? 'text-emerald-700'
                            : tech.availability === 'busy'
                              ? 'text-amber-700'
                              : 'text-slate-400'
                        }`}
                      >
                        {tech.availability.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-slate-500 font-mono-tabular">{liveActiveCount} active bays</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-bold text-[#0A1628] mb-3">Appointments Ready for Intake</h3>
            {openAppointments.length === 0 ? (
              <p className="text-xs text-slate-500">All scheduled appointments have been converted to repair orders.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {openAppointments.map((apt) => (
                  <li key={apt.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0A1628] truncate">
                        {apt.customerName} · {apt.vehicleLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {apt.scheduledDate} at {apt.scheduledSlot} · {apt.serviceType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => convertAppointmentToOrder(apt.id, technicians[0]?.id || '', 220)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#2563EB] hover:bg-[#2563EB]/5 whitespace-nowrap shrink-0"
                    >
                      Convert to RO
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Ongoing Repairs Monitor */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-[#0A1628]">Ongoing Repairs &amp; Handover Controls</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">RO / Vehicle</th>
                <th className="py-3 px-4">Assigned Tech</th>
                <th className="py-3 px-4">Stage &amp; ETA</th>
                <th className="py-3 px-4 text-right">Estimate</th>
                <th className="py-3 px-6 text-right">Advisor Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {serviceOrders.map((ro) => (
                <tr key={ro.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6">
                    <p className="font-mono-tabular font-semibold text-[#0A1628]">{ro.orderNumber}</p>
                    <p className="text-xs text-slate-500">
                      {ro.customerName} · {ro.vehicleLabel}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <select
                        aria-label={`Assign technician for ${ro.orderNumber}`}
                        value={ro.technicianId || ''}
                        onChange={(e) => assignTechnician(ro.id, e.target.value)}
                        className="px-2 py-1 rounded-md border border-slate-200 text-xs bg-white focus:outline-none focus:border-[#2563EB]"
                      >
                        <option value="">Unassigned</option>
                        {technicians.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs font-semibold text-[#0A1628]">{getStageLabel(ro.stage)}</p>
                    <p className={`text-xs mt-0.5 ${ro.isDelayed ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                      {ro.estimatedCompletion} {ro.isDelayed ? '· Delayed' : ''}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#0A1628]">
                    {formatCurrency(ro.totalCost)}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEtaOrder(ro);
                          setEtaValue(ro.estimatedCompletion);
                          setIsDelayedFlag(ro.isDelayed);
                          setDelayReason(ro.delayReason || '');
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                      >
                        Update ETA
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          sendNotification({
                            serviceOrderId: ro.id,
                            customerId: ro.customerId,
                            recipientName: ro.customerName,
                            recipientContact: ro.customerPhone,
                            channel: 'in_app',
                            templateType: 'progress',
                            message: buildNotificationTemplate('progress', {
                              customerName: ro.customerName,
                              vehicleLabel: ro.vehicleLabel,
                              orderNumber: ro.orderNumber,
                              stageLabel: getStageLabel(ro.stage),
                              estimatedCompletion: ro.estimatedCompletion,
                            }),
                            estimatedCompletion: ro.estimatedCompletion,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#2563EB] hover:bg-[#2563EB]/5 whitespace-nowrap"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Notify
                      </button>
                      {ro.stage !== 'ready_for_pickup' && (
                        <button
                          type="button"
                          onClick={() => setPickupTarget(ro)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready for Pickup
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Update ETA Modal */}
      {etaOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1628]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eta-modal-title"
        >
          <form
            onSubmit={handleSaveEta}
            className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4"
          >
            <h3 id="eta-modal-title" className="text-base font-bold text-[#0A1628]">
              Update ETA — {etaOrder.orderNumber}
            </h3>
            <div>
              <label htmlFor="modal-eta" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Estimated Completion Time
              </label>
              <input
                id="modal-eta"
                type="text"
                value={etaValue}
                onChange={(e) => setEtaValue(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isDelayedFlag}
                onChange={(e) => setIsDelayedFlag(e.target.checked)}
                className="rounded border-slate-300"
              />
              Flag repair order as delayed
            </label>
            {isDelayedFlag && (
              <div>
                <label htmlFor="modal-delay-reason" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Delay Reason
                </label>
                <input
                  id="modal-delay-reason"
                  type="text"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  placeholder="e.g. Awaiting OEM part delivery from regional depot"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEtaOrder(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                Save ETA
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pickupTarget)}
        title="Mark Vehicle Ready for Pickup"
        description={
          pickupTarget
            ? `Confirm final quality checks are complete for ${pickupTarget.vehicleLabel} (${pickupTarget.orderNumber}) and notify ${pickupTarget.customerName} that their vehicle is ready for handover.`
            : ''
        }
        confirmLabel="Confirm Ready & Notify"
        onConfirm={handleConfirmReadyForPickup}
        onCancel={() => setPickupTarget(null)}
      />
    </div>
  );
};
