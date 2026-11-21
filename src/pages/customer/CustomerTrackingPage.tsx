import React, { useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  Camera,
  CheckCircle2,
  Clock,
  Globe2,
  Recycle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import type { ApprovalRequest, SupportedLanguage } from '../../types/domain';
import { formatCurrency, getStageLabel } from '../../utils/workflow';
import { StageTimeline } from '../../components/StageTimeline';
import { SafeImage } from '../../components/SafeImage';
import { ConfirmDialog } from '../../components/ConfirmDialog';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  language: SupportedLanguage;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  ta: 'தமிழ் (Tamil)',
  hi: 'हिन्दी (Hindi)',
};

const QUICK_PROMPTS: Record<SupportedLanguage, string[]> = {
  en: [
    'What is the current status and ETA?',
    'Explain my repair cost breakdown.',
    'Why is the additional repair recommended?',
  ],
  ta: [
    'என் வாகனத்தின் தற்போதைய நிலை மற்றும் நேரம் என்ன?',
    'செலவு விவரத்தை விளக்குங்கள்.',
    'கூடுதல் பழுது ஏன் பரிந்துரைக்கப்பட்டது?',
  ],
  hi: [
    'मेरी कार की वर्तमान स्थिति और तैयार होने का समय क्या है?',
    'मरम्मत के खर्च का विवरण समझाएं।',
    'अतिरिक्त मरम्मत की सलाह क्यों दी गई है?',
  ],
};

export const CustomerTrackingPage: React.FC = () => {
  const {
    session,
    customers,
    employees,
    serviceOrders,
    approvalRequests,
    notifications,
    respondToApprovalRequest,
    submitCustomerRating,
    togglePartExchangeOptIn,
    askServiceAssistant,
    generateInspectionSummary,
  } = useService();

  const activeCustomer =
    customers.find((c) => c.id === session?.customerId) || customers[0];

  const myOrders = useMemo(
    () => serviceOrders.filter((o) => o.customerId === activeCustomer?.id),
    [serviceOrders, activeCustomer?.id]
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(myOrders[0]?.id || '');
  const activeOrder = myOrders.find((o) => o.id === selectedOrderId) || myOrders[0] || null;

  const orderApprovals = useMemo(
    () => (activeOrder ? approvalRequests.filter((a) => a.serviceOrderId === activeOrder.id) : []),
    [approvalRequests, activeOrder]
  );

  const assignedTechnician = useMemo(
    () =>
      activeOrder?.technicianId
        ? employees.find((e) => e.id === activeOrder.technicianId) || null
        : null,
    [employees, activeOrder?.technicianId]
  );

  const myNotifications = useMemo(
    () => notifications.filter((n) => n.customerId === activeCustomer?.id).slice(0, 4),
    [notifications, activeCustomer?.id]
  );

  // Approval confirmation dialog state
  const [approvalAction, setApprovalAction] = useState<{
    request: ApprovalRequest;
    decision: 'approved' | 'declined';
  } | null>(null);
  const [responseNote, setResponseNote] = useState('');

  // Gemini Multilingual Chat state
  const [chatLanguage, setChatLanguage] = useState<SupportedLanguage>(
    activeCustomer?.preferredLanguage || 'en'
  );
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [summarizing, setSummarizing] = useState(false);

  // Technician Rating state
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState('');

  const handleConfirmApprovalDecision = async () => {
    if (!approvalAction) return;
    await respondToApprovalRequest(
      approvalAction.request.id,
      approvalAction.decision,
      responseNote
    );
    setApprovalAction(null);
    setResponseNote('');
  };

  const handleSendChat = async (questionOverride?: string) => {
    if (!activeOrder) return;
    const text = (questionOverride ?? chatInput).trim();
    if (!text) return;

    setChatError('');
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text,
      language: chatLanguage,
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const answer = await askServiceAssistant({
        question: text,
        language: chatLanguage,
        order: activeOrder,
        approvals: orderApprovals,
        history: nextHistory.map((m) => ({ role: m.role, text: m.text })),
      });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: answer,
          language: chatLanguage,
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Assistant request failed.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleRefreshSummary = async () => {
    if (!activeOrder) return;
    setSummarizing(true);
    try {
      await generateInspectionSummary({
        order: activeOrder,
        language: chatLanguage,
      });
    } finally {
      setSummarizing(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    await submitCustomerRating(activeOrder.id, ratingValue, feedbackText);
    setFeedbackText('');
  };

  if (!activeOrder) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
        <h2 className="text-lg font-bold text-[#0A1628]">No Active Service Orders</h2>
        <p className="text-sm text-slate-500 mt-2">
          When your dealership opens a repair order for one of your vehicles, live seven-stage tracking will appear here.
        </p>
      </div>
    );
  }

  const pendingApprovals = orderApprovals.filter((a) => a.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Top Welcome & Multi-Vehicle Order Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#2563EB]">
            Live Repair Companion · Synced with Apex Pacific Motors
          </p>
          <h1 className="text-2xl font-bold text-[#0A1628] mt-0.5">
            Welcome back, {activeCustomer?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Available Circular Service Credits:{' '}
            <span className="font-mono-tabular font-semibold text-emerald-700">
              {formatCurrency(activeCustomer?.serviceCredits || 0)}
            </span>
          </p>
        </div>

        {myOrders.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-lg">
            {myOrders.map((ro) => (
              <button
                key={ro.id}
                type="button"
                onClick={() => {
                  setSelectedOrderId(ro.id);
                  setChatMessages([]);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeOrder.id === ro.id
                    ? 'bg-white text-[#0A1628] shadow-xs'
                    : 'text-slate-600 hover:text-[#0A1628]'
                }`}
              >
                {ro.vehicleLabel} ({ro.orderNumber})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pickup Ready Alert Banner */}
      {activeOrder.stage === 'ready_for_pickup' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-emerald-950">
                Your {activeOrder.vehicleLabel} is Ready for Pickup
              </h2>
              <p className="text-xs text-emerald-800 mt-0.5">
                Final quality check and handover wash are complete ({activeOrder.estimatedCompletion}). Review your final breakdown and rate your technician below.
              </p>
            </div>
          </div>
          <span className="text-sm font-bold font-mono-tabular text-emerald-900 whitespace-nowrap">
            Final Total: {formatCurrency(activeOrder.totalCost)}
          </span>
        </div>
      )}

      {/* Seven-Stage Live Repair Timeline Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono-tabular text-slate-500">
              {activeOrder.orderNumber} · Plate {activeOrder.registrationNumber} · Advisor:{' '}
              {activeOrder.advisorName || 'Service Desk'}
            </p>
            <h2 className="text-xl font-bold text-[#0A1628] mt-1">{activeOrder.vehicleLabel}</h2>
            <p className="text-sm text-slate-600 mt-1">{activeOrder.reportedIssues}</p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-xs text-slate-500">Estimated Completion</p>
            <p className="text-base font-bold text-[#0A1628] mt-0.5 flex items-center sm:justify-end gap-1.5">
              <Clock className="w-4 h-4 text-[#2563EB]" />
              {activeOrder.estimatedCompletion}
            </p>
            {activeOrder.isDelayed && (
              <p className="text-xs font-semibold text-amber-700 mt-1">
                Schedule revision: {activeOrder.delayReason || 'Parts delivery delay'}
              </p>
            )}
          </div>
        </div>

        <StageTimeline currentStage={activeOrder.stage} />
      </section>

      {/* Pending Additional Repair Approvals (Prominent Action Area) */}
      {orderApprovals.length > 0 && (
        <section className="space-y-4" aria-label="Additional repair recommendations">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0A1628]">
              Additional Repair Recommendations ({pendingApprovals.length} pending)
            </h2>
            <span className="text-xs text-slate-500">Your decision updates the technician bay immediately</span>
          </div>

          <div className={orderApprovals.length === 1 ? 'grid grid-cols-1 gap-5' : 'grid grid-cols-1 lg:grid-cols-2 gap-5'}>
            {orderApprovals.map((apr) => {
              const singleCard = orderApprovals.length === 1;
              return (
                <div
                  key={apr.id}
                  className={`bg-white border rounded-xl overflow-hidden ${
                    singleCard ? 'grid grid-cols-1 md:grid-cols-12' : 'flex flex-col justify-between'
                  } ${apr.status === 'pending' ? 'border-[#6366F1]' : 'border-slate-200'}`}
                >
                  {apr.mediaUrl && (
                    <div className={singleCard ? 'md:col-span-5 min-h-[220px] bg-[#0A1628]' : 'h-44 bg-[#0A1628]'}>
                      <SafeImage src={apr.mediaUrl} alt={apr.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className={`${singleCard ? (apr.mediaUrl ? 'md:col-span-7' : 'md:col-span-12') : ''} flex flex-col justify-between`}>
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-500">Recommended by {apr.technicianName}</span>
                        <span
                          className={`font-semibold capitalize ${
                            apr.status === 'approved'
                              ? 'text-emerald-700'
                              : apr.status === 'declined'
                                ? 'text-red-600'
                                : 'text-[#6366F1]'
                          }`}
                        >
                          {apr.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0A1628]">{apr.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{apr.description}</p>
                      <p className="text-lg font-bold font-mono-tabular text-[#0A1628] pt-1">
                        Estimated Additional Cost: {formatCurrency(apr.estimatedCost)}
                      </p>
                    </div>

                    {apr.status === 'pending' ? (
                      <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-3">
                        <input
                          type="text"
                          value={responseNote}
                          onChange={(e) => setResponseNote(e.target.value)}
                          placeholder="Optional note for your technician (e.g. proceed today)..."
                          aria-label={`Optional note for ${apr.title}`}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setApprovalAction({ request: apr, decision: 'approved' })}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Approve Repair ({formatCurrency(apr.estimatedCost)})
                          </button>
                          <button
                            type="button"
                            onClick={() => setApprovalAction({ request: apr, decision: 'declined' })}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Decline
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-600">
                        Decision recorded: <strong className="capitalize text-[#0A1628]">{apr.status}</strong>
                        {apr.customerResponseNote ? ` — "${apr.customerResponseNote}"` : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Content Grid: Left Details + Right Gemini Assistant & Costs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Technician Updates, Media Evidence, Health Insights, Circular Part Opt-in */}
        <div className="lg:col-span-7 space-y-6">
          {/* Technician Profile Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                <SafeImage
                  src={assignedTechnician?.avatarUrl || activeOrder.technicianAvatar}
                  alt={activeOrder.technicianName || 'Assigned technician'}
                  fallbackLabel={activeOrder.technicianName || 'Tech'}
                />
              </div>
              <div>
                <p className="text-xs text-slate-500">Assigned Certified Technician</p>
                <h3 className="text-base font-bold text-[#0A1628]">
                  {assignedTechnician?.name || activeOrder.technicianName || 'Assigning Bay Technician'}
                </h3>
                <p className="text-xs text-slate-600">
                  {assignedTechnician?.designation || 'Dealership Service Specialist'}
                  {assignedTechnician?.skills?.length
                    ? ` · ${assignedTechnician.skills.slice(0, 3).join(', ')}`
                    : ''}
                </p>
              </div>
            </div>
            {assignedTechnician && (
              <div className="sm:text-right shrink-0">
                <div className="inline-flex items-center gap-1 text-base font-bold font-mono-tabular text-[#0A1628]">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {assignedTechnician.averageRating.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500">
                  {assignedTechnician.completedJobs} completed jobs
                </p>
              </div>
            )}
          </div>

          {/* Plain-Language Updates Feed */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0A1628]">Service Updates &amp; Repair Progress</h3>
            {activeOrder.customerUpdates.length === 0 ? (
              <p className="text-sm text-slate-500">
                Your technician will publish plain-language updates here as each inspection step completes.
              </p>
            ) : (
              <ul className="space-y-4">
                {activeOrder.customerUpdates.map((u) => (
                  <li key={u.id} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span className="font-semibold text-[#2563EB]">{getStageLabel(u.stage)}</span>
                      <span className="uppercase font-mono-tabular">
                        {u.language} · {u.source === 'gemini' ? 'Gemini Simplified' : u.source}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{u.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Photos & Videos Gallery */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#0A1628]" />
              <h3 className="text-base font-bold text-[#0A1628]">
                Inspection Photos &amp; Videos ({activeOrder.media.length})
              </h3>
            </div>
            {activeOrder.media.length === 0 ? (
              <p className="text-sm text-slate-500">No inspection media attached yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeOrder.media.map((m) => (
                  <div key={m.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="h-44 bg-[#0A1628]">
                      {m.type === 'video' ? (
                        <video src={m.url} controls className="w-full h-full object-cover" />
                      ) : (
                        <SafeImage src={m.url} alt={m.caption} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-3 bg-white">
                      <p className="text-xs font-medium text-[#0A1628]">{m.caption}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Uploaded by {m.uploadedBy} · {getStageLabel(m.stage)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Health Insights & Maintenance Recommendations */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#0A1628]">
                  Vehicle Health Summary &amp; Maintenance Insights
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generated strictly from your vehicle&apos;s recorded inspection notes and checklist
                </p>
              </div>
              <button
                type="button"
                disabled={summarizing}
                onClick={handleRefreshSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#6366F1] hover:bg-[#6366F1]/5 disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {summarizing ? 'Summarizing...' : `Refresh in ${LANGUAGE_LABELS[chatLanguage].split(' ')[0]}`}
              </button>
            </div>

            {activeOrder.inspectionSummary && (
              <p className="text-sm text-slate-700 leading-relaxed">{activeOrder.inspectionSummary}</p>
            )}

            {activeOrder.maintenanceRecommendations.length > 0 && (
              <ul className="space-y-2 pt-2 border-t border-slate-100 text-sm text-slate-700">
                {activeOrder.maintenanceRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#2563EB] mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Voluntary Circular Part Exchange Opt-In */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Recycle className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#0A1628]">
                  Voluntary Circular Part Exchange for Service Credits
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Allow the dealership to inspect and refurbish eligible non-safety removed components
                  (such as headlamps, alternators, or trim modules) in exchange for $125 in future service
                  credits. Safety-critical parts are never reused.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => togglePartExchangeOptIn(activeOrder.id, !activeOrder.partExchangeOptIn)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                activeOrder.partExchangeOptIn
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-[#0A1628] text-white hover:bg-[#162744]'
              }`}
            >
              {activeOrder.partExchangeOptIn ? 'Opted In (+$125 Credit)' : 'Opt In for Credits'}
            </button>
          </div>

          {/* Post-Service Technician Rating & Feedback */}
          {(['repair_completed', 'ready_for_pickup'].includes(activeOrder.stage) ||
            Boolean(activeOrder.customerRating)) && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="text-base font-bold text-[#0A1628]">Rate Your Technician &amp; Service Experience</h3>
              {activeOrder.customerRating ? (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-100">
                  <p className="text-sm font-bold text-[#0A1628] flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    You rated {activeOrder.technicianName || 'your technician'} {activeOrder.customerRating} / 5
                  </p>
                  {activeOrder.customerFeedback && (
                    <p className="text-xs text-slate-600 mt-1.5">&ldquo;{activeOrder.customerFeedback}&rdquo;</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleRatingSubmit} className="space-y-4">
                  <div className="flex items-center gap-2" role="radiogroup" aria-label="Technician star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingValue(star)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= ratingValue
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-slate-600 ml-1">
                      {ratingValue} / 5 Stars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Share feedback on communication clarity, repair quality, and handover..."
                    aria-label="Service feedback"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
                  >
                    Submit Technician Rating
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Cost Breakdown + Gemini Multilingual Assistant + Alerts */}
        <div className="lg:col-span-5 space-y-6">
          {/* Repair Cost Breakdown */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0A1628]">Repair Cost Breakdown</h3>
            <ul className="divide-y divide-slate-100 text-sm">
              {activeOrder.costBreakdown.map((item) => (
                <li key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-800 font-medium">{item.label}</p>
                    <p className="text-[11px] text-slate-400 capitalize">
                      {item.category.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="font-mono-tabular font-semibold text-[#0A1628] whitespace-nowrap">
                    {formatCurrency(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Base Service Estimate</span>
                <span className="font-mono-tabular">{formatCurrency(activeOrder.baseEstimate)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Approved Additional Repairs</span>
                <span className="font-mono-tabular">{formatCurrency(activeOrder.approvedExtrasTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#0A1628] pt-2">
                <span>Current Authorized Total</span>
                <span className="font-mono-tabular">{formatCurrency(activeOrder.totalCost)}</span>
              </div>
            </div>
          </section>

          {/* Multilingual Gemini AI Service Companion Chat */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-[#0A1628] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-[#60A5FA]" />
                <div>
                  <h3 className="text-sm font-bold">Gemini Service Assistant</h3>
                  <p className="text-[11px] text-slate-300">
                    Grounded strictly in {activeOrder.orderNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-slate-300" />
                <label htmlFor="chat-lang-select" className="sr-only">
                  Select chat language
                </label>
                <select
                  id="chat-lang-select"
                  value={chatLanguage}
                  onChange={(e) => setChatLanguage(e.target.value as SupportedLanguage)}
                  className="bg-white/10 border border-white/20 rounded-md px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="en" className="text-[#0A1628]">English</option>
                  <option value="ta" className="text-[#0A1628]">தமிழ் (Tamil)</option>
                  <option value="hi" className="text-[#0A1628]">हिन्दी (Hindi)</option>
                </select>
              </div>
            </div>

            <div className="p-4 space-y-3 min-h-[240px] max-h-[360px] overflow-y-auto bg-slate-50/50">
              {chatMessages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ask any question about your vehicle&apos;s repair stages, technician notes, estimated
                    completion, or itemized costs in English, Tamil, or Hindi.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {QUICK_PROMPTS[chatLanguage].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSendChat(prompt)}
                        className="text-left px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-[#0A1628] hover:border-[#2563EB] transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#2563EB] text-white ml-8'
                        : 'bg-white border border-slate-200 text-slate-800 mr-4'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))
              )}

              {chatLoading && (
                <p className="text-xs text-slate-500">Reading your repair order and preparing answer...</p>
              )}
              {chatError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {chatError}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendChat();
              }}
              className="p-3 bg-white border-t border-slate-200 flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  chatLanguage === 'ta'
                    ? 'உங்கள் பழுது பற்றிய கேள்வியை கேளுங்கள்...'
                    : chatLanguage === 'hi'
                      ? 'अपनी कार की सर्विस के बारे में पूछें...'
                      : 'Ask about your repair order...'
                }
                aria-label="Ask Gemini Service Assistant"
                className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="submit"
                disabled={chatLoading}
                aria-label="Send message to Gemini Service Assistant"
                className="px-3.5 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </section>

          {/* Customer Notifications Strip */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0A1628]" />
              <h3 className="text-sm font-bold text-[#0A1628]">Recent Service Alerts</h3>
            </div>
            {myNotifications.length === 0 ? (
              <p className="text-xs text-slate-400">No alerts received yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {myNotifications.map((n) => (
                  <li key={n.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-slate-700 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1 uppercase font-mono-tabular">
                      {n.channel.replace('_', ' ')} · {n.sentByName}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(approvalAction)}
        title={
          approvalAction?.decision === 'approved'
            ? 'Confirm Additional Repair Approval'
            : 'Confirm Declining Repair Recommendation'
        }
        description={
          approvalAction
            ? approvalAction.decision === 'approved'
              ? `Authorize "${approvalAction.request.title}" for an estimated ${formatCurrency(approvalAction.request.estimatedCost)}? Your technician will resume work immediately and the updated total will appear on ${activeOrder.orderNumber}.`
              : `Decline "${approvalAction.request.title}"? The dealership will proceed only with your previously authorized work on ${activeOrder.orderNumber}.`
            : ''
        }
        confirmLabel={
          approvalAction?.decision === 'approved' ? 'Confirm Approval' : 'Confirm Decline'
        }
        variant={approvalAction?.decision === 'declined' ? 'danger' : 'primary'}
        onConfirm={handleConfirmApprovalDecision}
        onCancel={() => setApprovalAction(null)}
      />
    </div>
  );
};
