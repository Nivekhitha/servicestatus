import React, { useState } from 'react';
import { AlertCircle, Bell, Send } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { buildNotificationTemplate, getStageLabel } from '../../utils/workflow';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    serviceOrders,
    approvalRequests,
    integrations,
    sendNotification,
  } = useService();

  const [selectedOrderId, setSelectedOrderId] = useState(serviceOrders[0]?.id || '');
  const [channel, setChannel] = useState<'in_app' | 'sms' | 'whatsapp'>('in_app');
  const [templateType, setTemplateType] = useState<'progress' | 'approval' | 'delay' | 'ready' | 'appointment'>('progress');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const selectedOrder = serviceOrders.find((o) => o.id === selectedOrderId) || serviceOrders[0];
  const delayedCount = serviceOrders.filter((o) => o.isDelayed && o.stage !== 'ready_for_pickup').length;
  const pendingApprovalCount = approvalRequests.filter((a) => a.status === 'pending').length;

  const populateTemplate = (nextType: typeof templateType) => {
    setTemplateType(nextType);
    if (!selectedOrder) return;
    setMessage(
      buildNotificationTemplate(nextType, {
        customerName: selectedOrder.customerName,
        vehicleLabel: selectedOrder.vehicleLabel,
        orderNumber: selectedOrder.orderNumber,
        stageLabel: getStageLabel(selectedOrder.stage),
        estimatedCompletion: selectedOrder.estimatedCompletion,
        extraDetail: selectedOrder.delayReason,
      })
    );
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !message.trim()) return;
    setSending(true);
    try {
      await sendNotification({
        serviceOrderId: selectedOrder.id,
        customerId: selectedOrder.customerId,
        recipientName: selectedOrder.customerName,
        recipientContact: selectedOrder.customerPhone,
        channel,
        templateType,
        message,
        estimatedCompletion: selectedOrder.estimatedCompletion,
      });
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628]">Notifications &amp; Communication Center</h2>
        <p className="text-sm text-slate-600 mt-1">
          Centralized communication history for in-app portal alerts, Twilio SMS, and WhatsApp dispatch.
        </p>
      </div>

      {/* Honest Provider Status Banner */}
      {(!integrations?.twilio.smsConfigured || !integrations?.twilio.whatsappConfigured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="leading-relaxed">
            <strong className="font-semibold">External SMS/WhatsApp Credentials Not Yet Configured:</strong>{' '}
            In-App Customer Portal alerts deliver immediately in real time. SMS and WhatsApp dispatches
            honestly report &ldquo;Not Configured&rdquo; until <code className="font-mono">TWILIO_ACCOUNT_SID</code>,{' '}
            <code className="font-mono">TWILIO_AUTH_TOKEN</code>, and sender numbers are set in server environment variables (see Settings).
          </p>
        </div>
      )}

      {/* Alert Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Pending Approval Alerts</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#6366F1] mt-1">{pendingApprovalCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Delayed Repair Alerts</p>
          <p className="text-2xl font-bold font-mono-tabular text-amber-700 mt-1">{delayedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Total Logged Communications</p>
          <p className="text-2xl font-bold font-mono-tabular text-[#0A1628] mt-1">{notifications.length}</p>
        </div>
      </div>

      {/* Dispatch Composer */}
      <form onSubmit={handleDispatch} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0A1628]">Send Customer Notification</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="ntf-order" className="block text-xs font-semibold text-slate-700 mb-1">Repair Order</label>
            <select
              id="ntf-order"
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              {serviceOrders.map((ro) => (
                <option key={ro.id} value={ro.id}>
                  {ro.orderNumber} — {ro.customerName} ({ro.vehicleLabel})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ntf-channel" className="block text-xs font-semibold text-slate-700 mb-1">Delivery Channel</label>
            <select
              id="ntf-channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="in_app">Customer Portal Alert (Live)</option>
              <option value="sms">Twilio SMS</option>
              <option value="whatsapp">Twilio WhatsApp</option>
            </select>
          </div>
          <div>
            <label htmlFor="ntf-tpl" className="block text-xs font-semibold text-slate-700 mb-1">Message Template</label>
            <select
              id="ntf-tpl"
              value={templateType}
              onChange={(e) => populateTemplate(e.target.value as typeof templateType)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="progress">Repair Progress Update</option>
              <option value="approval">Additional Repair Approval</option>
              <option value="delay">Schedule Delay Revision</option>
              <option value="ready">Ready for Pickup Handover</option>
              <option value="appointment">Appointment Confirmation</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="ntf-msg" className="text-xs font-semibold text-slate-700">Message Content</label>
            <button
              type="button"
              onClick={() => populateTemplate(templateType)}
              className="text-xs font-semibold text-[#2563EB] hover:underline"
            >
              Fill Selected Template
            </button>
          </div>
          <textarea
            id="ntf-msg"
            rows={3}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Click 'Fill Selected Template' or type a custom customer update..."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-60"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Dispatching...' : 'Send Notification'}
        </button>
      </form>

      {/* Centralized Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#0A1628]" />
          <h3 className="text-sm font-bold text-[#0A1628]">Centralized Communication Audit Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-3 px-6">Recipient</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Sent By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50/60">
                  <td className="py-3.5 px-6 whitespace-nowrap">
                    <p className="font-semibold text-[#0A1628]">{n.recipientName}</p>
                    <p className="text-slate-400 font-mono-tabular">{n.recipientContact || 'Portal account'}</p>
                  </td>
                  <td className="py-3.5 px-4 uppercase font-mono-tabular font-semibold text-slate-700 whitespace-nowrap">
                    {n.channel.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 max-w-md">
                    <p className="text-slate-700 leading-relaxed">{n.message}</p>
                    {n.providerMessage && <p className="text-[11px] text-slate-400 mt-0.5">{n.providerMessage}</p>}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                    <span
                      className={
                        n.deliveryStatus === 'delivered' || n.deliveryStatus === 'in_app_logged'
                          ? 'text-emerald-700'
                          : n.deliveryStatus === 'not_configured'
                            ? 'text-amber-700'
                            : 'text-red-600'
                      }
                    >
                      {n.deliveryStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right text-slate-600 whitespace-nowrap">{n.sentByName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
