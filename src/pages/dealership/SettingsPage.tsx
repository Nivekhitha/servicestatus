import React, { useState } from 'react';
import { CheckCircle2, Database, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../../lib/firebase';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const SettingsPage: React.FC = () => {
  const {
    session,
    integrations,
    firestoreConnected,
    seedFirestoreFromDemo,
    resetDemoStore,
  } = useService();

  const [seeding, setSeeding] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSeedFirestore = async () => {
    setSeeding(true);
    try {
      await seedFirestoreFromDemo();
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A1628]">Platform Settings &amp; Environment Guide</h2>
        <p className="text-sm text-slate-600 mt-1">
          Verify live backend integration readiness, Firestore database binding, and required server environment variables.
        </p>
      </div>

      {/* Integration Health Matrix */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-[#0A1628]">Verified Integration Status</h3>
        </div>
        <div className="divide-y divide-slate-100 text-sm">
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#0A1628]">Firebase Cloud Firestore &amp; Auth</p>
              <p className="text-xs text-slate-500 font-mono-tabular mt-0.5">
                Project: {FIREBASE_PROJECT_ID} · Database: {FIRESTORE_DATABASE_ID}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
              <CheckCircle2 className="w-4 h-4" />
              {firestoreConnected ? 'Authenticated Live Sync' : 'Provisioned (Sign in to sync)'}
            </span>
          </div>

          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#0A1628]">Gemini AI Server Proxy</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Model: {integrations?.gemini.model || 'gemini-4-hydrogen'} · Server-side routes (/api/gemini/*)
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                integrations?.gemini.configured ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {integrations?.gemini.configured ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Configured on Server
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  GEMINI_API_KEY Missing
                </>
              )}
            </span>
          </div>

          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#0A1628]">Twilio SMS &amp; WhatsApp Provider</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, TWILIO_WHATSAPP_NUMBER
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${
                integrations?.twilio.smsConfigured || integrations?.twilio.whatsappConfigured
                  ? 'text-emerald-700'
                  : 'text-slate-500'
              }`}
            >
              {integrations?.twilio.smsConfigured || integrations?.twilio.whatsappConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Not Configured (Honest Fallback)
                </>
              )}
            </span>
          </div>

          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#0A1628]">Firebase Cloud Messaging (Web Push) &amp; External DMS</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Optional VAPID key (VITE_FIREBASE_VAPID_KEY) and DMS webhook bridge.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              {integrations?.fcm.configured ? 'FCM Configured' : 'Not Configured'}
            </span>
          </div>
        </div>
      </section>

      {/* Database Administration Controls */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#0A1628]">Firestore Dataset Sync</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            When signed in with your verified Firebase Admin account, you can seed the initial dealership
            employees, customers, vehicles, service orders, approval requests, and circular parts directly
            into Cloud Firestore for live multi-device testing.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={seeding || session?.mode !== 'firebase'}
              onClick={handleSeedFirestore}
              className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              {seeding ? 'Syncing to Firestore...' : 'Seed Demo Dataset to Firestore'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Local Sandbox Data
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0A1628]" />
            <h3 className="text-sm font-bold text-[#0A1628]">Environment Configuration Guide</h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            All private credentials remain strictly on the server in environment secrets — never in browser code.
          </p>
          <pre className="p-3.5 rounded-lg bg-[#0A1628] text-slate-200 text-[11px] font-mono-tabular overflow-x-auto leading-relaxed">
{`# Configure in AI Studio Settings > Secrets or .env
GEMINI_API_KEY=...
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
VITE_FIREBASE_VAPID_KEY=...`}
          </pre>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Reset Local Demo Dataset"
        description="This restores the local sandbox orders, approvals, and circular parts back to the initial demonstration baseline. Cloud Firestore records are unaffected."
        confirmLabel="Reset Local Sandbox"
        onConfirm={() => {
          resetDemoStore();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
};
