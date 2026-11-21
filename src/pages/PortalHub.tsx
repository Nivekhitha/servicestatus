import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Car, CheckCircle2, Globe2, Recycle, ShieldCheck, Wrench } from 'lucide-react';
import { useService } from '../context/ServiceContext';
import { ASSET_URLS } from '../data/seedData';
import { SafeImage } from '../components/SafeImage';
import { computeDashboardMetrics, computeSustainabilityMetrics } from '../utils/workflow';

export const PortalHub: React.FC = () => {
  const navigate = useNavigate();
  const { serviceOrders, employees, approvalRequests, appointments, circularParts, enterDemoSession } =
    useService();

  const metrics = computeDashboardMetrics(
    serviceOrders,
    employees,
    approvalRequests,
    appointments.length
  );
  const sustainability = computeSustainabilityMetrics(circularParts);

  const launchDealershipRole = (role: 'admin' | 'advisor' | 'technician' | 'parts_manager') => {
    enterDemoSession(role);
    if (role === 'technician') {
      navigate('/dealership/technician');
    } else if (role === 'parts_manager') {
      navigate('/dealership/parts-exchange');
    } else if (role === 'advisor') {
      navigate('/dealership/advisor');
    } else {
      navigate('/dealership/dashboard');
    }
  };

  const launchCustomerPortal = () => {
    enterDemoSession('customer', 'cust_1');
    navigate('/customer/tracking');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A1628] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[#0A1628] whitespace-nowrap shrink-0"
          >
            Service Status Companion
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Primary navigation">
            <a href="#portals" className="hover:text-[#0A1628] transition-colors whitespace-nowrap shrink-0">
              Portals
            </a>
            <a href="#workflow" className="hover:text-[#0A1628] transition-colors whitespace-nowrap shrink-0">
              Workflow
            </a>
            <Link to="/dealership/login" className="hover:text-[#0A1628] transition-colors whitespace-nowrap shrink-0">
              Dealership Login
            </Link>
            <Link to="/customer/login" className="hover:text-[#0A1628] transition-colors whitespace-nowrap shrink-0">
              Customer Login
            </Link>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to="/dealership/login"
              className="px-4 py-2 rounded-lg bg-[#0A1628] text-white text-sm font-medium hover:bg-[#162744] transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-[1280px] mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-1">
              <div>
                <p className="text-xs font-medium text-[#2563EB] tracking-wide mb-3">
                  Automotive Service Operations · Dealership &amp; Customer Sync
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#0A1628] leading-[1.12] max-w-xl">
                  Every bay update, inspection photo, and repair approval in live sync.
                </h1>
                <p className="text-base text-slate-600 leading-relaxed mt-5 max-w-xl">
                  Service Status Companion connects dealership advisors, technicians, and parts managers
                  directly with vehicle owners through a shared Firestore workspace, seven-stage repair
                  tracking, transparent digital approvals, and Gemini multilingual guidance.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => launchDealershipRole('admin')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors whitespace-nowrap shrink-0"
                >
                  Open Dealership Portal
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={launchCustomerPortal}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white text-[#0A1628] border border-slate-300 text-sm font-semibold hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Open Customer Portal
                  <Car className="w-4 h-4 text-[#2563EB]" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 sm:h-80 lg:h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-[#0A1628]">
                <SafeImage
                  src={ASSET_URLS.heroServiceBay}
                  alt="Modern automotive dealership service bay with silver sedan on precision lift"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/85 via-[#0A1628]/25 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <p className="text-xs text-slate-200">
                      Apex Pacific Motors · San Jose Service Operations
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      Real-time seven-stage bay telemetry connected directly to customer vehicles
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Live Operations Strip */}
          <div className="border-t border-slate-200 bg-[#F8FAFC]">
            <div className="max-w-[1280px] mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500">Active Repair Orders</p>
                <p className="text-2xl font-bold text-[#0A1628] font-mono-tabular mt-1">
                  {metrics.totalActiveOrders}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {metrics.vehiclesUnderRepair} currently on bay lifts
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending Approvals</p>
                <p className="text-2xl font-bold text-[#6366F1] font-mono-tabular mt-1">
                  {metrics.pendingApprovals}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Awaiting customer decision with evidence
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Customer Satisfaction</p>
                <p className="text-2xl font-bold text-[#0A1628] font-mono-tabular mt-1">
                  {metrics.customerSatisfaction.toFixed(1)} / 5.0
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified post-handover technician scores
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Circular CO2 Avoided</p>
                <p className="text-2xl font-bold text-emerald-700 font-mono-tabular mt-1">
                  {sustainability.totalCo2SavedKg} kg
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {sustainability.eligibleCount} non-safety OEM cores tracked
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Two Connected Portals Section */}
        <section id="portals" className="max-w-[1280px] mx-auto px-6 py-14">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl font-bold text-[#0A1628]">Two Connected Portals, One Shared Database</h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Sign in with Firebase Authentication or launch any role workspace below. Every repair stage
              change, uploaded inspection photo, Gemini customer update, and approval decision synchronizes
              immediately between both portals.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Dealership Portal Entry */}
            <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#0A1628] text-white flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1628]">Dealership Portal</h3>
                      <p className="text-xs text-slate-500">Admin · Service Advisor · Technician · Parts Manager</p>
                    </div>
                  </div>
                  <Link
                    to="/dealership/login"
                    className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
                  >
                    Employee Login
                  </Link>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Manage bay capacity, register customers and vehicles, open repair orders, upload inspection
                  photos and videos, translate technician notes via Gemini AI, dispatch approval requests,
                  and operate the Circular Parts Exchange.
                </p>

                <div className="border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold text-slate-500 mb-3">Quick Launch by Role</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => launchDealershipRole('admin')}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Admin Console</span>
                      <span className="block text-xs text-slate-500 mt-0.5">KPIs, staff, reports &amp; rules</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => launchDealershipRole('advisor')}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Service Advisor</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Intake, ROs &amp; assignments</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => launchDealershipRole('technician')}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Technician Bay</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Stages, media &amp; approvals</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => launchDealershipRole('parts_manager')}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Parts Manager</span>
                      <span className="block text-xs text-slate-500 mt-0.5">Circular exchange &amp; credits</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Portal Entry */}
            <div className="bg-white border border-slate-200 rounded-xl p-7 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#2563EB] text-white flex items-center justify-center">
                      <Car className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#0A1628]">Customer Portal</h3>
                      <p className="text-xs text-slate-500">Live Tracking · Digital Approvals · English / தமிழ் / हिन्दी</p>
                    </div>
                  </div>
                  <Link
                    to="/customer/login"
                    className="text-xs font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
                  >
                    Customer Sign In
                  </Link>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Follow your vehicle across all seven live repair stages, inspect technician photos, review
                  itemized costs, approve or decline additional repair recommendations, chat with the grounded
                  Gemini multilingual assistant, exchange eligible parts for service credits, and rate your technician.
                </p>

                <div className="border-t border-slate-100 pt-5 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      enterDemoSession('customer', 'cust_1');
                      navigate('/customer/tracking');
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[#0A1628] text-white hover:bg-[#162744] transition-colors"
                  >
                    <span className="block text-left">
                      <span className="block text-sm font-semibold">Enter as Ananya Rao (Volvo XC60 &amp; Audi Q5)</span>
                      <span className="block text-xs text-slate-300 mt-0.5">
                        1 pending brake approval · 1 vehicle ready for pickup &amp; rating
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        enterDemoSession('customer', 'cust_2');
                        navigate('/customer/tracking');
                      }}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Rohan Mehta (हिन्दी)</span>
                      <span className="block text-xs text-slate-500 mt-0.5">2022 BMW 330i · Diagnosis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        enterDemoSession('customer', 'cust_3');
                        navigate('/customer/tracking');
                      }}
                      className="text-left px-3.5 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-[#2563EB]/5 transition-colors"
                    >
                      <span className="block text-sm font-semibold text-[#0A1628]">Karthik N. (தமிழ்)</span>
                      <span className="block text-xs text-slate-500 mt-0.5">2024 IONIQ 5 · In Repair</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow Capabilities Strip */}
        <section id="workflow" className="border-t border-slate-200 bg-white">
          <div className="max-w-[1280px] mx-auto px-6 py-14">
            <h2 className="text-xl font-bold text-[#0A1628] mb-8">End-to-End Automotive Service Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <Wrench className="w-5 h-5 text-[#2563EB] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A1628]">Seven-Stage Bay Tracking</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                  Structured progression from Vehicle Received through Inspection, Diagnosis, Repair,
                  Approval Hold, Completion, and Handover.
                </p>
              </div>
              <div>
                <Globe2 className="w-5 h-5 text-[#6366F1] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A1628]">Grounded Gemini Translation</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                  Turns technical OBD-II and measurement notes into clear updates in English, Tamil, and
                  Hindi without fabricating prices or ETAs.
                </p>
              </div>
              <div>
                <CheckCircle2 className="w-5 h-5 text-[#2563EB] mb-3" />
                <h3 className="text-sm font-semibold text-[#0A1628]">Evidence-Backed Approvals</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                  Technicians attach photos and itemized quotes; customer decisions update dealership repair
                  orders and totals immediately.
                </p>
              </div>
              <div>
                <Recycle className="w-5 h-5 text-emerald-700 mb-3" />
                <h3 className="text-sm font-semibold text-[#0A1628]">Circular Parts Exchange</h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1.5">
                  Recovers eligible non-safety OEM modules for inter-dealership reuse while strictly
                  blocking safety-critical components.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-[#F8FAFC] py-6">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0A1628]" />
            <span>Service Status Companion · Role-Based Firestore Security &amp; Server-Side AI Proxy</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/dealership/login" className="hover:text-[#0A1628] transition-colors">
              Dealership Login
            </Link>
            <Link to="/customer/login" className="hover:text-[#0A1628] transition-colors">
              Customer Login
            </Link>
            <Link to="/customer/register" className="hover:text-[#0A1628] transition-colors">
              Customer Registration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
