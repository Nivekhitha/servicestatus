import React, { useEffect, useState } from 'react';
import { Recycle, Save } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import type { SupportedLanguage } from '../../types/domain';
import { formatCurrency } from '../../utils/workflow';

export const CustomerProfilePage: React.FC = () => {
  const { session, customers, updateCustomer } = useService();
  const activeCustomer =
    customers.find((c) => c.id === session?.customerId) || customers[0];

  const [name, setName] = useState(activeCustomer?.name || '');
  const [phone, setPhone] = useState(activeCustomer?.phone || '');
  const [address, setAddress] = useState(activeCustomer?.address || '');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLanguage>(
    activeCustomer?.preferredLanguage || 'en'
  );

  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name);
      setPhone(activeCustomer.phone);
      setAddress(activeCustomer.address || '');
      setPreferredLanguage(activeCustomer.preferredLanguage);
    }
  }, [activeCustomer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !name.trim() || !phone.trim()) return;
    await updateCustomer(activeCustomer.id, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      preferredLanguage,
    });
  };

  if (!activeCustomer) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0A1628]">Customer Profile &amp; Preferences</h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your contact details, preferred language for Gemini service translations, and Circular Parts credits.
        </p>
      </div>

      {/* Circular Credits Balance */}
      <div className="bg-[#0A1628] text-white rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Recycle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-300">Circular Parts Exchange Balance</p>
            <p className="text-2xl font-bold font-mono-tabular mt-0.5">
              {formatCurrency(activeCustomer.serviceCredits)}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Redeemable toward periodic maintenance, inspection labor, or accessories on future service orders.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="prof-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="prof-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prof-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="prof-email"
              type="email"
              disabled
              value={activeCustomer.email}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500"
            />
          </div>
          <div>
            <label htmlFor="prof-phone" className="block text-xs font-semibold text-slate-700 mb-1">
              Mobile Phone (SMS &amp; WhatsApp Alerts)
            </label>
            <input
              id="prof-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <div>
            <label htmlFor="prof-lang" className="block text-xs font-semibold text-slate-700 mb-1">
              Preferred Language (Gemini Updates &amp; Chat)
            </label>
            <select
              id="prof-lang"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as SupportedLanguage)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
            >
              <option value="en">English</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="prof-addr" className="block text-xs font-semibold text-slate-700 mb-1">
            Residential Address
          </label>
          <input
            id="prof-addr"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
        >
          <Save className="w-3.5 h-3.5" />
          Save Profile Changes
        </button>
      </form>
    </div>
  );
};
