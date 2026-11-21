import React, { useState } from 'react';
import { CarFront, History, Plus, Search, UserPlus } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import type { SupportedLanguage } from '../../types/domain';
import { formatCurrency, getStageLabel } from '../../utils/workflow';

interface CustomersVehiclesPageProps {
  defaultTab: 'customers' | 'vehicles';
}

export const CustomersVehiclesPage: React.FC<CustomersVehiclesPageProps> = ({ defaultTab }) => {
  const { customers, vehicles, serviceOrders, addCustomer, addVehicle } = useService();
  const [tab, setTab] = useState<'customers' | 'vehicles'>(defaultTab);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  // Customer form
  const [showCustForm, setShowCustForm] = useState(false);
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cLang, setCLang] = useState<SupportedLanguage>('en');
  const [cError, setCError] = useState('');

  // Vehicle form
  const [showVehForm, setShowVehForm] = useState(false);
  const [vCustomerId, setVCustomerId] = useState(customers[0]?.id || '');
  const [vMake, setVMake] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState('2024');
  const [vReg, setVReg] = useState('');
  const [vMileage, setVMileage] = useState('24000');
  const [vColor, setVColor] = useState('');
  const [vError, setVError] = useState('');

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCError('');
    if (!cName.trim() || !cEmail.trim() || !cPhone.trim()) {
      setCError('Customer name, email, and phone number are required.');
      return;
    }
    const created = await addCustomer({
      name: cName.trim(),
      email: cEmail.trim(),
      phone: cPhone.trim(),
      preferredLanguage: cLang,
      address: cAddress.trim(),
    });
    setSelectedCustomerId(created.id);
    setVCustomerId(created.id);
    setCName('');
    setCEmail('');
    setCPhone('');
    setCAddress('');
    setShowCustForm(false);
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVError('');
    if (!vCustomerId || !vMake.trim() || !vModel.trim() || !vReg.trim()) {
      setVError('Owner, make, model, and registration number are required.');
      return;
    }
    await addVehicle({
      customerId: vCustomerId,
      make: vMake.trim(),
      model: vModel.trim(),
      year: Number(vYear) || 2024,
      registrationNumber: vReg.trim().toUpperCase(),
      mileageKm: Number(vMileage) || 0,
      color: vColor.trim() || 'Metallic Gray',
    });
    setVMake('');
    setVModel('');
    setVReg('');
    setVColor('');
    setShowVehForm(false);
  };

  const q = search.trim().toLowerCase();
  const filteredCustomers = customers.filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
  );
  const filteredVehicles = vehicles.filter(
    (v) =>
      !q ||
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes(q) ||
      v.registrationNumber.toLowerCase().includes(q)
  );

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0];
  const selectedCustomerVehicles = selectedCustomer
    ? vehicles.filter((v) => v.customerId === selectedCustomer.id)
    : [];
  const selectedCustomerOrders = selectedCustomer
    ? serviceOrders.filter((o) => o.customerId === selectedCustomer.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">
            {tab === 'customers' ? 'Customer Directory & Service History' : 'Registered Vehicles'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Link customer contact profiles, registered vehicles, and complete repair histories across portals.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setTab('customers');
              setShowCustForm((v) => !v);
              setShowVehForm(false);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Customer
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('vehicles');
              setShowVehForm((v) => !v);
              setShowCustForm(false);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Register Vehicle
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-200/70 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setTab('customers')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'customers' ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600'
            }`}
          >
            Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('vehicles')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === 'vehicles' ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600'
            }`}
          >
            Vehicles ({vehicles.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'customers' ? 'Search name, email, phone...' : 'Search model or registration...'}
            aria-label="Search records"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-[#2563EB]"
          />
        </div>
      </div>

      {/* Add Customer Form */}
      {showCustForm && (
        <form onSubmit={handleCreateCustomer} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4" noValidate>
          <h3 className="text-base font-bold text-[#0A1628]">Register New Customer</h3>
          {cError && (
            <div className="px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {cError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="c-name" className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <input id="c-name" type="text" value={cName} onChange={(e) => setCName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label htmlFor="c-email" className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input id="c-email" type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label htmlFor="c-phone" className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
              <input id="c-phone" type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="+14155550299" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label htmlFor="c-lang" className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
              <select id="c-lang" value={cLang} onChange={(e) => setCLang(e.target.value as SupportedLanguage)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                <option value="en">English</option>
                <option value="ta">Tamil (தமிழ்)</option>
                <option value="hi">Hindi (हिन्दी)</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="c-address" className="block text-xs font-semibold text-slate-700 mb-1">Address (Optional)</label>
            <input id="c-address" type="text" value={cAddress} onChange={(e) => setCAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCustForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold">Save Customer</button>
          </div>
        </form>
      )}

      {/* Add Vehicle Form */}
      {showVehForm && (
        <form onSubmit={handleCreateVehicle} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4" noValidate>
          <h3 className="text-base font-bold text-[#0A1628]">Register Customer Vehicle</h3>
          {vError && (
            <div className="px-3.5 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {vError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="v-owner" className="block text-xs font-semibold text-slate-700 mb-1">Customer Owner</label>
              <select id="v-owner" value={vCustomerId} onChange={(e) => setVCustomerId(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white">
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="v-make" className="block text-xs font-semibold text-slate-700 mb-1">Make</label>
              <input id="v-make" type="text" value={vMake} onChange={(e) => setVMake(e.target.value)} placeholder="e.g. Mercedes-Benz" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label htmlFor="v-model" className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
              <input id="v-model" type="text" value={vModel} onChange={(e) => setVModel(e.target.value)} placeholder="e.g. GLC 300" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
            </div>
            <div>
              <label htmlFor="v-year" className="block text-xs font-semibold text-slate-700 mb-1">Model Year</label>
              <input id="v-year" type="number" min={1950} max={2030} value={vYear} onChange={(e) => setVYear(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular" />
            </div>
            <div>
              <label htmlFor="v-reg" className="block text-xs font-semibold text-slate-700 mb-1">Registration Number</label>
              <input id="v-reg" type="text" value={vReg} onChange={(e) => setVReg(e.target.value)} placeholder="CA-9MGL-442" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular" />
            </div>
            <div>
              <label htmlFor="v-mileage" className="block text-xs font-semibold text-slate-700 mb-1">Odometer (km)</label>
              <input id="v-mileage" type="number" min={0} value={vMileage} onChange={(e) => setVMileage(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowVehForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold">Save Vehicle</button>
          </div>
        </form>
      )}

      {tab === 'customers' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-5 text-right">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedCustomer?.id === c.id ? 'bg-[#2563EB]/8' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-[#0A1628]">{c.name}</p>
                      <p className="text-xs text-slate-400">
                        {vehicles.filter((v) => v.customerId === c.id).length} registered vehicles
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <p>{c.email}</p>
                      <p className="text-slate-400">{c.phone}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs uppercase font-mono-tabular text-slate-600">
                      {c.preferredLanguage}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono-tabular font-semibold text-emerald-700">
                      {formatCurrency(c.serviceCredits)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            {selectedCustomer ? (
              <>
                <div>
                  <h3 className="text-base font-bold text-[#0A1628]">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCustomer.email} · {selectedCustomer.phone}
                  </p>
                  {selectedCustomer.address && (
                    <p className="text-xs text-slate-500 mt-1">{selectedCustomer.address}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
                    <CarFront className="w-3.5 h-3.5" />
                    <span>Linked Vehicles ({selectedCustomerVehicles.length})</span>
                  </div>
                  {selectedCustomerVehicles.length === 0 ? (
                    <p className="text-xs text-slate-400">No vehicles registered yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedCustomerVehicles.map((v) => (
                        <li key={v.id} className="text-xs flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                          <span className="font-semibold text-[#0A1628]">
                            {v.year} {v.make} {v.model}
                          </span>
                          <span className="font-mono-tabular text-slate-500">{v.registrationNumber}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2.5">
                    <History className="w-3.5 h-3.5" />
                    <span>Service Order History ({selectedCustomerOrders.length})</span>
                  </div>
                  {selectedCustomerOrders.length === 0 ? (
                    <p className="text-xs text-slate-400">No service orders recorded yet.</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {selectedCustomerOrders.map((ro) => (
                        <li key={ro.id} className="text-xs pb-2.5 border-b border-slate-100 last:border-0">
                          <div className="flex items-center justify-between">
                            <span className="font-mono-tabular font-semibold text-[#2563EB]">{ro.orderNumber}</span>
                            <span className="font-mono-tabular font-semibold text-[#0A1628]">
                              {formatCurrency(ro.totalCost)}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-0.5">{ro.vehicleLabel}</p>
                          <p className="text-slate-400 mt-0.5">{getStageLabel(ro.stage)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a customer to view linked vehicles and service records.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Vehicle</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Odometer</th>
                  <th className="py-3 px-6 text-right">Service Records</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredVehicles.map((v) => {
                  const owner = customers.find((c) => c.id === v.customerId);
                  const orderCount = serviceOrders.filter((o) => o.vehicleId === v.id).length;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-6">
                        <p className="font-semibold text-[#0A1628]">
                          {v.year} {v.make} {v.model}
                        </p>
                        <p className="text-xs text-slate-400">{v.color || 'OEM Finish'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#2563EB]">
                        {v.registrationNumber}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">{owner?.name || 'Unlinked'}</td>
                      <td className="py-3.5 px-4 text-right font-mono-tabular text-slate-600">
                        {(v.mileageKm || 0).toLocaleString()} km
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono-tabular font-semibold text-[#0A1628]">
                        {orderCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
