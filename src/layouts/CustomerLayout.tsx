import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Car, ClipboardCheck, LogOut, UserCircle2 } from 'lucide-react';
import { useService } from '../context/ServiceContext';

export const CustomerLayout: React.FC = () => {
  const { session, customers, switchActiveRole, logout } = useService();
  const navigate = useNavigate();

  const activeCustomer =
    customers.find((c) => c.id === session?.customerId) || customers[0];

  const handleOpenDealership = () => {
    switchActiveRole('admin');
    navigate('/dealership/dashboard');
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Customer Portal Clean Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <Link
            to="/customer/tracking"
            className="text-base sm:text-lg font-bold tracking-tight text-[#0A1628] whitespace-nowrap shrink-0"
          >
            Service Status Companion
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Customer portal navigation">
            <NavLink
              to="/customer/tracking"
              className={({ isActive }) =>
                `transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#2563EB] font-semibold' : 'hover:text-[#0A1628]'
                }`
              }
            >
              Active Repair
            </NavLink>
            <NavLink
              to="/customer/vehicles"
              className={({ isActive }) =>
                `transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#2563EB] font-semibold' : 'hover:text-[#0A1628]'
                }`
              }
            >
              My Vehicles &amp; History
            </NavLink>
            <NavLink
              to="/customer/profile"
              className={({ isActive }) =>
                `transition-colors whitespace-nowrap shrink-0 ${
                  isActive ? 'text-[#2563EB] font-semibold' : 'hover:text-[#0A1628]'
                }`
              }
            >
              Profile &amp; Credits
            </NavLink>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="customer-account-select" className="sr-only">
              Switch customer account
            </label>
            <select
              id="customer-account-select"
              value={activeCustomer?.id || ''}
              onChange={(e) => switchActiveRole('customer', e.target.value)}
              className="hidden sm:block px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-[#0A1628]"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleOpenDealership}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#0A1628] hover:bg-slate-50 whitespace-nowrap"
            >
              <Building2 className="w-3.5 h-3.5 text-[#2563EB]" />
              Dealership
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out of Customer Portal"
              className="p-2 rounded-lg text-slate-500 hover:text-[#0A1628] hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact mobile sub-nav */}
        <nav className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center justify-around text-xs font-semibold text-slate-600 bg-white">
          <NavLink
            to="/customer/tracking"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 py-1 ${isActive ? 'text-[#2563EB]' : ''}`
            }
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Active Repair
          </NavLink>
          <NavLink
            to="/customer/vehicles"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 py-1 ${isActive ? 'text-[#2563EB]' : ''}`
            }
          >
            <Car className="w-3.5 h-3.5" />
            Vehicles
          </NavLink>
          <NavLink
            to="/customer/profile"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 py-1 ${isActive ? 'text-[#2563EB]' : ''}`
            }
          >
            <UserCircle2 className="w-3.5 h-3.5" />
            Profile
          </NavLink>
        </nav>
      </header>

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
