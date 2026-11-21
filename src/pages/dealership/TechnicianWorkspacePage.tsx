import React, { useMemo, useState } from 'react';
import {
  Camera,
  CheckSquare,
  FilePlus2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Star,
  Upload,
  User,
} from 'lucide-react';
import { useService } from '../../context/ServiceContext';
import { ASSET_URLS } from '../../data/seedData';
import type { RepairStage, SupportedLanguage } from '../../types/domain';
import { buildNotificationTemplate, formatCurrency, getStageLabel } from '../../utils/workflow';
import { StageTimeline } from '../../components/StageTimeline';
import { SafeImage } from '../../components/SafeImage';

export const TechnicianWorkspacePage: React.FC = () => {
  const {
    session,
    employees,
    serviceOrders,
    approvalRequests,
    notifications,
    integrations,
    updateOrderStage,
    toggleChecklistTask,
    addChecklistTask,
    addTechnicalNote,
    addCustomerUpdate,
    uploadOrderMedia,
    createApprovalRequest,
    sendNotification,
    generateFriendlyUpdate,
  } = useService();

  const activeTechnician = useMemo(() => {
    const bySession = employees.find((e) => e.id === session?.employeeId && e.role === 'technician');
    return bySession || employees.find((e) => e.role === 'technician') || employees[0];
  }, [employees, session?.employeeId]);

  const [jobScope, setJobScope] = useState<'mine' | 'all'>('mine');
  const assignedJobs = useMemo(() => {
    if (jobScope === 'all') return serviceOrders;
    const filtered = serviceOrders.filter((o) => o.technicianId === activeTechnician?.id);
    return filtered.length > 0 ? filtered : serviceOrders;
  }, [serviceOrders, activeTechnician?.id, jobScope]);

  const [selectedOrderId, setSelectedOrderId] = useState<string>(assignedJobs[0]?.id || '');
  const selectedOrder =
    assignedJobs.find((o) => o.id === selectedOrderId) || assignedJobs[0] || null;

  const [activeTab, setActiveTab] = useState<'workspace' | 'media' | 'approvals' | 'comms' | 'profile'>('workspace');

  // Checklist & Notes state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [techNoteText, setTechNoteText] = useState('');
  const [translateLang, setTranslateLang] = useState<SupportedLanguage>('en');
  const [translating, setTranslating] = useState(false);
  const [draftCustomerUpdate, setDraftCustomerUpdate] = useState('');

  // Media Upload state
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaCaption, setMediaCaption] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Additional Repair Approval state
  const [aprTitle, setAprTitle] = useState('');
  const [aprDesc, setAprDesc] = useState('');
  const [aprCost, setAprCost] = useState('');
  const [aprError, setAprError] = useState('');

  // Communication state
  const [commChannel, setCommChannel] = useState<'in_app' | 'sms' | 'whatsapp'>('in_app');
  const [commTemplate, setCommTemplate] = useState<'progress' | 'delay' | 'approval' | 'ready'>('progress');
  const [commMessage, setCommMessage] = useState('');
  const [sendingComm, setSendingComm] = useState(false);

  const orderApprovals = useMemo(
    () => (selectedOrder ? approvalRequests.filter((a) => a.serviceOrderId === selectedOrder.id) : []),
    [approvalRequests, selectedOrder]
  );

  const orderComms = useMemo(
    () => (selectedOrder ? notifications.filter((n) => n.serviceOrderId === selectedOrder.id) : []),
    [notifications, selectedOrder]
  );

  const handleStageSelect = async (stage: RepairStage) => {
    if (!selectedOrder) return;
    await updateOrderStage(selectedOrder.id, stage);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newTaskTitle.trim()) return;
    await addChecklistTask(selectedOrder.id, newTaskTitle);
    setNewTaskTitle('');
  };

  const handleSaveTechnicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !techNoteText.trim()) return;
    await addTechnicalNote(selectedOrder.id, techNoteText);
    setTechNoteText('');
  };

  const handleGenerateGeminiUpdate = async () => {
    if (!selectedOrder) return;
    const sourceNote =
      techNoteText.trim() || selectedOrder.technicalNotes[0]?.text || selectedOrder.reportedIssues;
    setTranslating(true);
    try {
      const friendly = await generateFriendlyUpdate({
        technicalNote: sourceNote,
        language: translateLang,
        stageLabel: getStageLabel(selectedOrder.stage),
        vehicleLabel: selectedOrder.vehicleLabel,
        estimatedCompletion: selectedOrder.estimatedCompletion,
      });
      setDraftCustomerUpdate(friendly);
    } catch {
      // Toast already surfaced by context
    } finally {
      setTranslating(false);
    }
  };

  const handlePublishCustomerUpdate = async () => {
    if (!selectedOrder || !draftCustomerUpdate.trim()) return;
    await addCustomerUpdate(selectedOrder.id, draftCustomerUpdate, translateLang, 'gemini');
    setDraftCustomerUpdate('');
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !mediaCaption.trim()) return;
    setUploadingMedia(true);
    try {
      await uploadOrderMedia(
        selectedOrder.id,
        mediaFile,
        ASSET_URLS.inspectionBrakeRotor,
        mediaCaption,
        mediaType
      );
      setMediaFile(null);
      setMediaCaption('');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleCreateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    setAprError('');
    if (!selectedOrder) return;
    if (!aprTitle.trim() || !aprDesc.trim()) {
      setAprError('Enter both a repair title and technical description.');
      return;
    }
    const cost = Number(aprCost);
    if (!Number.isFinite(cost) || cost <= 0) {
      setAprError('Enter a valid positive estimated cost in USD.');
      return;
    }

    await createApprovalRequest({
      serviceOrderId: selectedOrder.id,
      title: aprTitle,
      description: aprDesc,
      estimatedCost: cost,
      mediaUrl: selectedOrder.media[0]?.url || ASSET_URLS.inspectionBrakeRotor,
      mediaCaption: selectedOrder.media[0]?.caption || 'Supporting workshop inspection evidence',
    });

    setAprTitle('');
    setAprDesc('');
    setAprCost('');
  };

  const applyCommTemplate = (tpl: 'progress' | 'delay' | 'approval' | 'ready') => {
    setCommTemplate(tpl);
    if (!selectedOrder) return;
    setCommMessage(
      buildNotificationTemplate(tpl, {
        customerName: selectedOrder.customerName,
        vehicleLabel: selectedOrder.vehicleLabel,
        orderNumber: selectedOrder.orderNumber,
        stageLabel: getStageLabel(selectedOrder.stage),
        estimatedCompletion: selectedOrder.estimatedCompletion,
        extraDetail: selectedOrder.delayReason,
      })
    );
  };

  const handleSendComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !commMessage.trim()) return;
    setSendingComm(true);
    try {
      await sendNotification({
        serviceOrderId: selectedOrder.id,
        customerId: selectedOrder.customerId,
        recipientName: selectedOrder.customerName,
        recipientContact: selectedOrder.customerPhone,
        channel: commChannel,
        templateType: commTemplate,
        message: commMessage,
        estimatedCompletion: selectedOrder.estimatedCompletion,
      });
      setCommMessage('');
    } finally {
      setSendingComm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#0A1628]">Technician Bay Workspace</h2>
          <p className="text-sm text-slate-600 mt-1">
            Logged in as {activeTechnician?.name} · {activeTechnician?.designation} ({activeTechnician?.employeeCode})
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-slate-200/70 shrink-0">
          <button
            type="button"
            onClick={() => setJobScope('mine')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              jobScope === 'mine' ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600 hover:text-[#0A1628]'
            }`}
          >
            My Assigned Jobs
          </button>
          <button
            type="button"
            onClick={() => setJobScope('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
              jobScope === 'all' ? 'bg-white text-[#0A1628] shadow-xs' : 'text-slate-600 hover:text-[#0A1628]'
            }`}
          >
            All Active Bays
          </button>
        </div>
      </div>

      {/* Main Split: Assigned Jobs Queue + Active Job Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Assigned Jobs Queue */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0A1628]">Assigned Jobs ({assignedJobs.length})</h3>
            <span className="text-xs text-slate-500">Select to manage</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {assignedJobs.map((job) => {
              const isSelected = selectedOrder?.id === job.id;
              return (
                <li key={job.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrderId(job.id);
                      setTranslateLang(job.preferredLanguage || 'en');
                    }}
                    className={`w-full text-left px-5 py-4 transition-colors ${
                      isSelected ? 'bg-[#2563EB]/8' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-[#2563EB]">
                        {job.orderNumber}
                      </span>
                      <span
                        className={`text-xs font-semibold capitalize ${
                          job.priority === 'urgent'
                            ? 'text-red-600'
                            : job.priority === 'high'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                        }`}
                      >
                        {job.priority} priority
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#0A1628] mt-1">{job.vehicleLabel}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {job.registrationNumber} · {job.customerName}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{job.reportedIssues}</p>
                    <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
                      <span className="font-semibold text-[#0A1628]">{getStageLabel(job.stage)}</span>
                      <span>ETA: {job.estimatedCompletion}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Active Job Workbench */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedOrder ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm text-slate-600">No service orders currently assigned.</p>
            </div>
          ) : (
            <>
              {/* Active Job Header + 7-Stage Stepper */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono-tabular font-semibold text-[#2563EB]">
                        {selectedOrder.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{selectedOrder.registrationNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>Owner: {selectedOrder.customerName} ({selectedOrder.customerPhone})</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0A1628] mt-1">
                      {selectedOrder.vehicleLabel}
                    </h3>
                    <p className="text-sm text-slate-600 mt-1.5">{selectedOrder.reportedIssues}</p>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <p className="text-xs text-slate-500">Expected Completion</p>
                    <p className="text-sm font-bold text-[#0A1628] mt-0.5">
                      {selectedOrder.estimatedCompletion}
                    </p>
                    <p className="text-xs font-mono-tabular text-slate-500 mt-1">
                      Running Total: {formatCurrency(selectedOrder.totalCost)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2.5">
                    Click any stage below to update live customer tracking:
                  </p>
                  <StageTimeline
                    currentStage={selectedOrder.stage}
                    interactive
                    compact
                    onSelectStage={handleStageSelect}
                  />
                </div>

                {/* Workbench Tabs */}
                <div className="flex flex-wrap xl:flex-nowrap items-center gap-1 pt-2 border-t border-slate-100">
                  {[
                    { id: 'workspace', label: 'Checklist & Notes', icon: CheckSquare },
                    { id: 'media', label: `Media (${selectedOrder.media.length})`, icon: Camera },
                    { id: 'approvals', label: `Approvals (${orderApprovals.length})`, icon: FilePlus2 },
                    { id: 'comms', label: 'Customer Comms', icon: MessageSquare },
                    { id: 'profile', label: 'My Profile', icon: User },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          active
                            ? 'bg-[#0A1628] text-white'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1628]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: Checklist, Technical Notes & Gemini Customer Translation */}
              {activeTab === 'workspace' && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Task Checklist */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-bold text-[#0A1628]">Repair Task Checklist</h4>
                    <ul className="space-y-2.5">
                      {selectedOrder.checklist.map((task) => (
                        <li key={task.id} className="flex items-start gap-2.5">
                          <input
                            id={`chk-${task.id}`}
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleChecklistTask(selectedOrder.id, task.id)}
                            className="mt-1 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                          />
                          <label
                            htmlFor={`chk-${task.id}`}
                            className={`text-sm cursor-pointer leading-snug ${
                              task.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {task.title}
                            {task.completedAt && (
                              <span className="block text-[11px] text-slate-400 no-underline">
                                Completed · {task.completedAt}
                              </span>
                            )}
                          </label>
                        </li>
                      ))}
                    </ul>

                    <form onSubmit={handleAddTask} className="flex gap-2 pt-3 border-t border-slate-100">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Add inspection or repair step..."
                        aria-label="New checklist task"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-[#2563EB]"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#0A1628] text-white text-xs font-semibold hover:bg-[#162744] whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </form>
                  </div>

                  {/* Technical Notes + Gemini Customer Update Generator */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                    <h4 className="text-sm font-bold text-[#0A1628]">
                      Technical Observations &amp; Gemini Translation
                    </h4>

                    <form onSubmit={handleSaveTechnicalNote} className="space-y-3">
                      <textarea
                        rows={3}
                        value={techNoteText}
                        onChange={(e) => setTechNoteText(e.target.value)}
                        placeholder="Enter technical measurements, OBD-II fault codes, or part inspection notes..."
                        aria-label="Technical inspection observation"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs leading-relaxed focus:outline-none focus:border-[#2563EB]"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="submit"
                          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 whitespace-nowrap"
                        >
                          Save Technical Note
                        </button>
                        <select
                          aria-label="Customer update language"
                          value={translateLang}
                          onChange={(e) => setTranslateLang(e.target.value as SupportedLanguage)}
                          className="px-2.5 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                        >
                          <option value="en">English</option>
                          <option value="ta">Tamil (தமிழ்)</option>
                          <option value="hi">Hindi (हिन्दी)</option>
                        </select>
                        <button
                          type="button"
                          disabled={translating}
                          onClick={handleGenerateGeminiUpdate}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {translating ? 'Generating...' : 'Convert with Gemini'}
                        </button>
                      </div>
                    </form>

                    {draftCustomerUpdate && (
                      <div className="p-4 rounded-lg bg-[#2563EB]/6 border border-[#2563EB]/25 space-y-3">
                        <p className="text-xs font-semibold text-[#2563EB]">
                          Gemini Customer-Friendly Draft ({translateLang.toUpperCase()})
                        </p>
                        <textarea
                          rows={3}
                          value={draftCustomerUpdate}
                          onChange={(e) => setDraftCustomerUpdate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={handlePublishCustomerUpdate}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8]"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Publish to Customer Portal
                        </button>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-100 space-y-2.5">
                      <p className="text-xs font-semibold text-slate-500">Recent Technical Log</p>
                      {selectedOrder.technicalNotes.length === 0 ? (
                        <p className="text-xs text-slate-400">No technical notes recorded yet.</p>
                      ) : (
                        selectedOrder.technicalNotes.map((note) => (
                          <div key={note.id} className="text-xs text-slate-700 pb-2.5 border-b border-slate-100 last:border-0">
                            <p className="leading-relaxed">{note.text}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {note.authorName} · {getStageLabel(note.stage)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Photo & Video Evidence Upload */}
              {activeTab === 'media' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <form onSubmit={handleUploadMedia} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-3">
                      <label htmlFor="media-type" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Media Type
                      </label>
                      <select
                        id="media-type"
                        value={mediaType}
                        onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="image">Inspection Photo</option>
                        <option value="video">Walkaround Video</option>
                      </select>
                    </div>
                    <div className="md:col-span-4">
                      <label htmlFor="media-file" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Capture / Upload File
                      </label>
                      <input
                        id="media-file"
                        type="file"
                        accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-[#0A1628]"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label htmlFor="media-caption" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Evidence Description
                      </label>
                      <input
                        id="media-caption"
                        type="text"
                        required
                        value={mediaCaption}
                        onChange={(e) => setMediaCaption(e.target.value)}
                        placeholder="Describe finding..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={uploadingMedia}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-60"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Attach
                      </button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    {selectedOrder.media.length === 0 ? (
                      <p className="text-xs text-slate-500 col-span-2">
                        No inspection photos or videos uploaded for this repair order yet.
                      </p>
                    ) : (
                      selectedOrder.media.map((item) => (
                        <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                          <div className="h-44 bg-[#0A1628]">
                            {item.type === 'video' ? (
                              <video src={item.url} controls className="w-full h-full object-cover" />
                            ) : (
                              <SafeImage src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div className="p-3 bg-white">
                            <p className="text-xs font-medium text-[#0A1628]">{item.caption}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {item.uploadedBy} · {getStageLabel(item.stage)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Additional Repair Approval Requests */}
              {activeTab === 'approvals' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <form onSubmit={handleCreateApproval} className="space-y-4">
                    <h4 className="text-sm font-bold text-[#0A1628]">Create Additional Repair Approval Request</h4>
                    {aprError && (
                      <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        {aprError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="apr-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Additional Repair Title
                        </label>
                        <input
                          id="apr-title"
                          type="text"
                          value={aprTitle}
                          onChange={(e) => setAprTitle(e.target.value)}
                          placeholder="e.g. Rear Shock Absorber Pair Replacement"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="apr-cost" className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Estimated Cost (USD)
                        </label>
                        <input
                          id="apr-cost"
                          type="number"
                          min={1}
                          value={aprCost}
                          onChange={(e) => setAprCost(e.target.value)}
                          placeholder="380"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono-tabular"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="apr-desc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Technical Findings &amp; Safety Justification
                      </label>
                      <textarea
                        id="apr-desc"
                        rows={3}
                        value={aprDesc}
                        onChange={(e) => setAprDesc(e.target.value)}
                        placeholder="Explain measurements, wear condition, parts included, and why this work is recommended..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#6366F1] text-white text-xs font-semibold hover:bg-[#4F46E5]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Approval Request to Customer
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h4 className="text-xs font-semibold text-slate-500">Approval History for {selectedOrder.orderNumber}</h4>
                    {orderApprovals.length === 0 ? (
                      <p className="text-xs text-slate-400">No additional repair requests created for this order.</p>
                    ) : (
                      orderApprovals.map((apr) => (
                        <div key={apr.id} className="p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#0A1628]">{apr.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{apr.description}</p>
                            {apr.customerResponseNote && (
                              <p className="text-xs text-slate-500 mt-1.5">
                                Customer note: &ldquo;{apr.customerResponseNote}&rdquo;
                              </p>
                            )}
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p className="text-sm font-bold font-mono-tabular text-[#0A1628]">
                              {formatCurrency(apr.estimatedCost)}
                            </p>
                            <p
                              className={`text-xs font-semibold capitalize mt-0.5 ${
                                apr.status === 'approved'
                                  ? 'text-emerald-700'
                                  : apr.status === 'declined'
                                    ? 'text-red-600'
                                    : 'text-[#6366F1]'
                              }`}
                            >
                              {apr.status}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: Customer Communication (SMS / WhatsApp / In-App) */}
              {activeTab === 'comms' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#0A1628]">Send Customer Update</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Recipient: {selectedOrder.customerName} ({selectedOrder.customerPhone}) · ETA: {selectedOrder.estimatedCompletion}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      Twilio SMS: {integrations?.twilio.smsConfigured ? 'Configured' : 'Not configured'} · WhatsApp:{' '}
                      {integrations?.twilio.whatsappConfigured ? 'Configured' : 'Not configured'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'progress', label: 'Repair Progress' },
                      { key: 'delay', label: 'Schedule Delay' },
                      { key: 'approval', label: 'Approval Needed' },
                      { key: 'ready', label: 'Ready for Pickup' },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => applyCommTemplate(t.key as typeof commTemplate)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#0A1628] hover:border-[#2563EB] hover:bg-[#2563EB]/5"
                      >
                        Template: {t.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendComm} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label htmlFor="comm-channel" className="text-xs font-semibold text-slate-700">
                        Channel
                      </label>
                      <select
                        id="comm-channel"
                        value={commChannel}
                        onChange={(e) => setCommChannel(e.target.value as typeof commChannel)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                      >
                        <option value="in_app">Customer Portal Notification (Live)</option>
                        <option value="sms">SMS via Twilio</option>
                        <option value="whatsapp">WhatsApp via Twilio</option>
                      </select>
                    </div>

                    <textarea
                      rows={3}
                      required
                      value={commMessage}
                      onChange={(e) => setCommMessage(e.target.value)}
                      placeholder="Select a predefined template above or compose a direct status update including latest ETA..."
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sendingComm}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-60"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sendingComm ? 'Dispatching...' : `Send ${commChannel.replace('_', ' ').toUpperCase()}`}
                    </button>
                  </form>

                  <div className="pt-4 border-t border-slate-100 space-y-2.5">
                    <p className="text-xs font-semibold text-slate-500">Communication History</p>
                    {orderComms.length === 0 ? (
                      <p className="text-xs text-slate-400">No messages sent for this repair order yet.</p>
                    ) : (
                      orderComms.map((log) => (
                        <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold uppercase text-[#0A1628]">{log.channel}</span>
                            <span>
                              {log.deliveryStatus.replace('_', ' ')} · {log.sentByName}
                            </span>
                          </div>
                          <p className="text-slate-700 mt-1 leading-relaxed">{log.message}</p>
                          {log.providerMessage && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{log.providerMessage}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Technician Profile */}
              {activeTab === 'profile' && activeTechnician && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start gap-5">
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <SafeImage
                        src={activeTechnician.avatarUrl}
                        alt={activeTechnician.name}
                        fallbackLabel={activeTechnician.name}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-[#0A1628]">{activeTechnician.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {activeTechnician.designation} · {activeTechnician.department} · ID {activeTechnician.employeeCode}
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        {activeTechnician.email} · {activeTechnician.phone}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-xs text-[#2563EB] font-medium">
                        {activeTechnician.skills.map((sk) => (
                          <span key={sk}>{sk}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="inline-flex items-center gap-1 text-lg font-bold font-mono-tabular text-[#0A1628]">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        {activeTechnician.averageRating.toFixed(2)}
                      </div>
                      <p className="text-xs text-slate-500">
                        {activeTechnician.ratingCount} customer ratings · {activeTechnician.completedJobs} completed jobs
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <h5 className="text-xs font-semibold text-slate-500 mb-3">Recent Customer Feedback</h5>
                    <div className="space-y-2.5">
                      {serviceOrders
                        .filter((o) => o.technicianId === activeTechnician.id && o.customerFeedback)
                        .map((o) => (
                          <div key={o.id} className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                            <p className="text-xs font-semibold text-[#0A1628]">
                              {o.customerName} · {o.vehicleLabel} · {o.customerRating}/5 Stars
                            </p>
                            <p className="text-xs text-slate-600 mt-1">&ldquo;{o.customerFeedback}&rdquo;</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
