import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  CalendarClock,
  CarFront,
  CheckSquare,
  ClipboardList,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Recycle,
  Settings,
  Users,
  UserSquare2,
  Wrench,
  X,
} from 'lucide-react';
import { useService } from '../context/ServiceContext';
import type { DealershipRole } from '../types/domain';
import { SafeImage } from '../components/SafeImage';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: DealershipRole[];
  badgeCount?: number;
}

export const DealershipLayout: React.FC = () => {
  const { session, approvalRequests, switchActiveRole, logout } = useService();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeRole: DealershipRole =
    session && session.role !== 'customer' ? session.role : 'admin';

  const pendingApprovalCount = approvalRequests.filter((a) => a.status === 'pending').length;

  const navItems: NavItem[] = [
    {
      to: '/dealership/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'advisor', 'technician', 'parts_manager'],
    },
    {
      to: '/dealership/advisor',
      label: 'Advisor Desk',
      icon: ClipboardList,
      roles: ['admin', 'advisor'],
    },
    {
      to: '/dealership/technician',
      label: 'Technician Bay',
      icon: Wrench,
      roles: ['admin', 'technician'],
    },
    {
      to: '/dealership/employees',
      label: 'Employees',
      icon: UserSquare2,
      roles: ['admin'],
    },
    {
      to: '/dealership/customers',
      label: 'Customers',
      icon: Users,
      roles: ['admin', 'advisor'],
    },
    {
      to: '/dealership/vehicles',
      label: 'Vehicles',
      icon: CarFront,
      roles: ['admin', 'advisor', 'technician'],
    },
    {
      to: '/dealership/service-orders',
      label: 'Service Orders',
      icon: ClipboardList,
      roles: ['admin', 'advisor', 'technician', 'parts_manager'],
    },
    {
      to: '/dealership/appointments',
      label: 'Appointments',
      icon: CalendarClock,
      roles: ['admin', 'advisor'],
    },
    {
      to: '/dealership/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      roles: ['admin', 'advisor', 'technician'],
      badgeCount: pendingApprovalCount,
    },
    {
      to: '/dealership/parts-exchange',
      label: 'Parts Exchange',
      icon: Recycle,
      roles: ['admin', 'parts_manager', 'advisor', 'technician'],
    },
    {
      to: '/dealership/notifications',
      label: 'Notifications',
      icon: Bell,
      roles: ['admin', 'advisor', 'technician'],
    },
    {
      to: '/dealership/reports',
      label: 'Reports',
      icon: BarChart3,
      roles: ['admin', 'advisor', 'parts_manager'],
    },
    {
      to: '/dealership/settings',
      label: 'Settings',
      icon: Settings,
      roles: ['admin', 'advisor', 'technician', 'parts_manager'],
    },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(activeRole));
  const currentPageLabel =
    navItems.find((item) => location.pathname.startsWith(item.to))?.label || 'Dealership Portal';

  const handleRoleSwitch = (nextRole: DealershipRole) => {
    switchActiveRole(nextRole);
    if (nextRole === 'technician') navigate('/dealership/technician');
    else if (nextRole === 'advisor') navigate('/dealership/advisor');
    else if (nextRole === 'parts_manager') navigate('/dealership/parts-exchange');
    else navigate('/dealership/dashboard');
  };

  const handleOpenCustomerPortal = () => {
    switchActiveRole('customer', 'cust_1');
    navigate('/customer/tracking');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0A1628] text-slate-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
          Service Status Companion
        </Link>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Dealership navigation">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-300 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </span>
              {typeof item.badgeCount === 'number' && item.badgeCount > 0 && (
                <span className="text-xs font-mono-tabular font-semibold text-white/90">
                  {item.badgeCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <button
          type="button"
          onClick={handleOpenCustomerPortal}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Live Customer Portal
        </button>
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
              <SafeImage
                src={session?.avatarUrl}
                alt={session?.displayName || 'Dealership staff'}
                fallbackLabel={session?.displayName?.slice(0, 2) || 'SC'}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {session?.displayName || 'Operations Admin'}
              </p>
              <p className="text-[11px] text-slate-400 capitalize truncate">
                {activeRole.replace('_', ' ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen border-r border-slate-200">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full shadow-2xl">{renderSidebarContent()}</div>
          <button
            type="button"
            aria-label="Close sidebar backdrop"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1 bg-[#0A1628]/50"
          />
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline">Dealership</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <h1 className="font-semibold text-[#0A1628] truncate">{currentPageLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label htmlFor="dealership-role-switcher" className="sr-only">
              Switch dealership role workspace
            </label>
            <select
              id="dealership-role-switcher"
              value={activeRole}
              onChange={(e) => handleRoleSwitch(e.target.value as DealershipRole)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-[#0A1628] focus:outline-none focus:border-[#2563EB]"
            >
              <option value="admin">Role: Admin</option>
              <option value="advisor">Role: Service Advisor</option>
              <option value="technician">Role: Technician</option>
              <option value="parts_manager">Role: Parts Manager</option>
            </select>
            <Link
              to="/dealership/service-orders"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
            >
              Service Orders
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
