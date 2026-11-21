import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  storage,
} from '../lib/firebase';
import {
  SEED_APPOINTMENTS,
  SEED_APPROVAL_REQUESTS,
  SEED_CIRCULAR_PARTS,
  SEED_CUSTOMERS,
  SEED_EMPLOYEES,
  SEED_NOTIFICATIONS,
  SEED_SERVICE_ORDERS,
  SEED_VEHICLES,
} from '../data/seedData';
import type {
  Appointment,
  ApprovalRequest,
  CircularPart,
  Customer,
  DealershipRole,
  Employee,
  IntegrationStatus,
  MediaAttachment,
  NotificationLog,
  RepairStage,
  ServiceOrder,
  SupportedLanguage,
  UserRole,
  Vehicle,
} from '../types/domain';
import {
  applyApprovalDecisionToOrder,
  computeNewTechnicianRating,
  getStageIndex,
  getStageLabel,
  isSafetyCriticalPart,
  recalculateOrderTotals,
} from '../utils/workflow';

const STORAGE_KEY = 'ssc_shared_store_v1';
const SESSION_KEY = 'ssc_active_session_v1';
const SYNC_CHANNEL = 'ssc_live_sync_v1';

export interface ActiveSession {
  mode: 'firebase' | 'demo';
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeId?: string;
  customerId?: string;
  preferredLanguage: SupportedLanguage;
  avatarUrl?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface SharedStore {
  employees: Employee[];
  customers: Customer[];
  vehicles: Vehicle[];
  appointments: Appointment[];
  serviceOrders: ServiceOrder[];
  approvalRequests: ApprovalRequest[];
  circularParts: CircularPart[];
  notifications: NotificationLog[];
}

function getInitialStore(): SharedStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SharedStore>;
      if (Array.isArray(parsed.serviceOrders) && parsed.serviceOrders.length > 0) {
        return {
          employees: parsed.employees || SEED_EMPLOYEES,
          customers: parsed.customers || SEED_CUSTOMERS,
          vehicles: parsed.vehicles || SEED_VEHICLES,
          appointments: parsed.appointments || SEED_APPOINTMENTS,
          serviceOrders: parsed.serviceOrders,
          approvalRequests: parsed.approvalRequests || SEED_APPROVAL_REQUESTS,
          circularParts: parsed.circularParts || SEED_CIRCULAR_PARTS,
          notifications: parsed.notifications || SEED_NOTIFICATIONS,
        };
      }
    }
  } catch {
    // Fallback to seed data
  }
  return {
    employees: SEED_EMPLOYEES,
    customers: SEED_CUSTOMERS,
    vehicles: SEED_VEHICLES,
    appointments: SEED_APPOINTMENTS,
    serviceOrders: SEED_SERVICE_ORDERS,
    approvalRequests: SEED_APPROVAL_REQUESTS,
    circularParts: SEED_CIRCULAR_PARTS,
    notifications: SEED_NOTIFICATIONS,
  };
}

function getInitialSession(): ActiveSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ActiveSession;
      if (parsed && parsed.mode === 'demo' && parsed.role) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function normalizeTimestamp(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ServiceContextValue {
  authReady: boolean;
  firebaseUser: FirebaseUser | null;
  session: ActiveSession | null;
  firestoreConnected: boolean;
  integrations: IntegrationStatus | null;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (type: ToastMessage['type'], text: string) => void;

  // Shared real-time collections
  employees: Employee[];
  customers: Customer[];
  vehicles: Vehicle[];
  appointments: Appointment[];
  serviceOrders: ServiceOrder[];
  approvalRequests: ApprovalRequest[];
  circularParts: CircularPart[];
  notifications: NotificationLog[];

  // Auth actions
  loginWithGoogle: (portal: 'dealership' | 'customer') => Promise<void>;
  loginWithEmail: (email: string, password: string, portal: 'dealership' | 'customer') => Promise<void>;
  registerCustomerAccount: (input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    preferredLanguage: SupportedLanguage;
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  enterDemoSession: (role: UserRole, specificId?: string) => void;
  switchActiveRole: (role: UserRole, specificId?: string) => void;
  logout: () => Promise<void>;
  seedFirestoreFromDemo: () => Promise<void>;
  resetDemoStore: () => void;

  // Employee CRUD
  addEmployee: (input: Omit<Employee, 'id' | 'activeJobCount' | 'completedJobs' | 'averageRating' | 'ratingCount' | 'createdAt' | 'updatedAt'>) => Promise<Employee>;
  updateEmployee: (id: string, patch: Partial<Employee>) => Promise<void>;
  toggleEmployeeActive: (id: string) => Promise<void>;

  // Customer & Vehicle CRUD
  addCustomer: (input: Omit<Customer, 'id' | 'serviceCredits' | 'createdAt' | 'updatedAt'>) => Promise<Customer>;
  updateCustomer: (id: string, patch: Partial<Customer>) => Promise<void>;
  addVehicle: (input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Vehicle>;

  // Appointments
  createAppointment: (input: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<Appointment>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<void>;
  convertAppointmentToOrder: (appointmentId: string, technicianId: string, baseEstimate: number) => Promise<ServiceOrder | null>;

  // Service Orders
  createServiceOrder: (input: {
    customerId: string;
    vehicleId: string;
    technicianId?: string;
    priority: ServiceOrder['priority'];
    reportedIssues: string;
    estimatedCompletion: string;
    baseEstimate: number;
  }) => Promise<ServiceOrder>;
  updateOrderStage: (orderId: string, stage: RepairStage) => Promise<void>;
  assignTechnician: (orderId: string, technicianId: string) => Promise<void>;
  updateOrderEtaAndDelay: (orderId: string, estimatedCompletion: string, isDelayed: boolean, delayReason?: string) => Promise<void>;
  toggleChecklistTask: (orderId: string, taskId: string) => Promise<void>;
  addChecklistTask: (orderId: string, title: string) => Promise<void>;
  addTechnicalNote: (orderId: string, text: string) => Promise<void>;
  addCustomerUpdate: (orderId: string, text: string, language: SupportedLanguage, source: 'gemini' | 'advisor' | 'technician') => Promise<void>;
  uploadOrderMedia: (orderId: string, file: File | null, fallbackUrl: string, caption: string, type: 'image' | 'video') => Promise<MediaAttachment>;
  updateInspectionInsights: (orderId: string, summary: string, recommendations: string[]) => Promise<void>;
  submitCustomerRating: (orderId: string, rating: number, feedback: string) => Promise<void>;
  togglePartExchangeOptIn: (orderId: string, optIn: boolean) => Promise<void>;

  // Additional Repair Approvals
  createApprovalRequest: (input: {
    serviceOrderId: string;
    title: string;
    description: string;
    estimatedCost: number;
    mediaUrl?: string;
    mediaCaption?: string;
  }) => Promise<ApprovalRequest>;
  respondToApprovalRequest: (requestId: string, decision: 'approved' | 'declined', responseNote?: string) => Promise<void>;

  // Circular Parts Exchange
  addCircularPart: (input: {
    partName: string;
    category: string;
    condition: CircularPart['condition'];
    compatibleModels: string;
    dealershipName: string;
    inspectionNotes?: string;
    imageUrl?: string;
    creditValue: number;
    co2SavedKg: number;
    sourceOrderId?: string;
    sourceCustomerId?: string;
  }) => Promise<CircularPart>;
  requestCircularPart: (partId: string, requestingDealership: string) => Promise<void>;
  completeCircularPartExchange: (partId: string) => Promise<void>;

  // Notifications
  sendNotification: (input: {
    serviceOrderId?: string;
    customerId: string;
    recipientName: string;
    recipientContact?: string;
    channel: 'sms' | 'whatsapp' | 'in_app';
    templateType: string;
    message: string;
    estimatedCompletion?: string;
  }) => Promise<NotificationLog>;

  // Gemini AI endpoints
  generateFriendlyUpdate: (params: {
    technicalNote: string;
    language: SupportedLanguage;
    stageLabel: string;
    vehicleLabel: string;
    estimatedCompletion: string;
  }) => Promise<string>;
  askServiceAssistant: (params: {
    question: string;
    language: SupportedLanguage;
    order: ServiceOrder;
    approvals: ApprovalRequest[];
    history: { role: 'user' | 'assistant'; text: string }[];
  }) => Promise<string>;
  generateInspectionSummary: (params: {
    order: ServiceOrder;
    language: SupportedLanguage;
  }) => Promise<{ summary: string; recommendations: string[] }>;
}

const ServiceContext = createContext<ServiceContextValue | null>(null);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [store, setStore] = useState<SharedStore>(() => getInitialStore());
  const [session, setSession] = useState<ActiveSession | null>(() => getInitialSession());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firestoreConnected, setFirestoreConnected] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = makeId('toast');
    setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const persistLocalStore = useCallback((next: SharedStore) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      channelRef.current?.postMessage({ type: 'STORE_UPDATE', payload: next });
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const mutateStore = useCallback(
    (updater: (prev: SharedStore) => SharedStore) => {
      setStore((prev) => {
        const next = updater(prev);
        persistLocalStore(next);
        return next;
      });
    },
    [persistLocalStore]
  );

  // Live cross-tab sync for real-time Dealership <-> Customer updates
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL);
      channelRef.current = ch;
      ch.onmessage = (event) => {
        if (event.data?.type === 'STORE_UPDATE' && event.data.payload) {
          setStore(event.data.payload as SharedStore);
        }
      };
      return () => {
        ch.close();
        channelRef.current = null;
      };
    }
    return undefined;
  }, []);

  // Fetch server-side integration status (Gemini, Twilio SMS/WhatsApp, FCM)
  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: IntegrationStatus | null) => {
        if (data) setIntegrations(data);
      })
      .catch(() => {
        // Ignore network fetch error during initial boot
      });
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);

      if (user) {
        const isBootstrappedAdmin =
          Boolean(user.emailVerified) && user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
        const matchedEmp = store.employees.find(
          (e) => e.email.toLowerCase() === (user.email || '').toLowerCase()
        );
        const matchedCust = store.customers.find(
          (c) => c.email.toLowerCase() === (user.email || '').toLowerCase()
        );

        const resolvedRole: UserRole = isBootstrappedAdmin
          ? 'admin'
          : matchedEmp
            ? matchedEmp.role
            : 'customer';

        const fbSession: ActiveSession = {
          mode: 'firebase',
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || matchedEmp?.name || matchedCust?.name || 'Verified User',
          role: resolvedRole,
          employeeId: matchedEmp?.id || (isBootstrappedAdmin ? 'emp_admin_1' : undefined),
          customerId: matchedCust?.id || 'cust_1',
          preferredLanguage: matchedCust?.preferredLanguage || 'en',
          avatarUrl: user.photoURL || matchedEmp?.avatarUrl,
        };
        setSession(fbSession);
        setFirestoreConnected(true);

        // Ensure user profile doc exists in Firestore if email verified
        if (user.emailVerified) {
          try {
            await setDoc(
              doc(db, 'users', user.uid),
              {
                uid: user.uid,
                email: user.email || '',
                displayName: fbSession.displayName.slice(0, 120),
                role: isBootstrappedAdmin ? 'admin' : 'customer',
                preferredLanguage: fbSession.preferredLanguage,
                isActive: true,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // Profile may already exist with immutable createdAt; safe to proceed
          }
        }
      } else {
        setFirestoreConnected(false);
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time Firestore onSnapshot listeners when authenticated as verified Firebase user
  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || session?.mode !== 'firebase') {
      return undefined;
    }

    const isBootstrappedAdmin = firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
    const unsubs: (() => void)[] = [];

    const attachCollection = <T extends { id: string }>(
      colName: keyof SharedStore,
      refQuery: ReturnType<typeof query> | ReturnType<typeof collection>
    ) => {
      const unsub = onSnapshot(
        refQuery,
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => {
            const raw = d.data() as Record<string, unknown>;
            return {
              ...raw,
              id: d.id,
              createdAt: normalizeTimestamp(raw.createdAt),
              updatedAt: normalizeTimestamp(raw.updatedAt),
            } as unknown as T;
          });
          setStore((prev) => ({ ...prev, [colName]: items }));
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, colName);
        }
      );
      unsubs.push(unsub);
    };

    if (isBootstrappedAdmin) {
      attachCollection<Employee>('employees', collection(db, 'employees'));
      attachCollection<Customer>('customers', collection(db, 'customers'));
      attachCollection<Vehicle>('vehicles', collection(db, 'vehicles'));
      attachCollection<Appointment>('appointments', collection(db, 'appointments'));
      attachCollection<ServiceOrder>('serviceOrders', collection(db, 'serviceOrders'));
      attachCollection<ApprovalRequest>('approvalRequests', collection(db, 'approvalRequests'));
      attachCollection<CircularPart>('circularParts', collection(db, 'circularParts'));
      attachCollection<NotificationLog>('notifications', collection(db, 'notifications'));
    } else {
      attachCollection<Customer>(
        'customers',
        query(collection(db, 'customers'), where('userId', '==', firebaseUser.uid))
      );
      attachCollection<Vehicle>(
        'vehicles',
        query(collection(db, 'vehicles'), where('customerUserId', '==', firebaseUser.uid))
      );
      attachCollection<ServiceOrder>(
        'serviceOrders',
        query(collection(db, 'serviceOrders'), where('customerUserId', '==', firebaseUser.uid))
      );
      attachCollection<ApprovalRequest>(
        'approvalRequests',
        query(collection(db, 'approvalRequests'), where('customerUserId', '==', firebaseUser.uid))
      );
      attachCollection<CircularPart>(
        'circularParts',
        query(collection(db, 'circularParts'), where('status', '==', 'available'))
      );
      attachCollection<NotificationLog>(
        'notifications',
        query(collection(db, 'notifications'), where('customerUserId', '==', firebaseUser.uid))
      );
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseUser, session?.mode]);

  const canWriteFirestore = Boolean(firebaseUser && firebaseUser.emailVerified && session?.mode === 'firebase');

  // --- Auth Methods ---
  const loginWithGoogle = useCallback(
    async (portal: 'dealership' | 'customer') => {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const isBootstrappedAdmin =
          Boolean(user.emailVerified) && user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL;
        const matchedEmp = store.employees.find(
          (e) => e.email.toLowerCase() === (user.email || '').toLowerCase()
        );
        const role: UserRole =
          portal === 'customer'
            ? 'customer'
            : isBootstrappedAdmin
              ? 'admin'
              : matchedEmp?.role || 'advisor';
        const nextSession: ActiveSession = {
          mode: 'firebase',
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Authenticated User',
          role,
          employeeId: matchedEmp?.id || (role !== 'customer' ? 'emp_admin_1' : undefined),
          customerId: 'cust_1',
          preferredLanguage: 'en',
          avatarUrl: user.photoURL || undefined,
        };
        setSession(nextSession);
        pushToast('success', `Signed in with Google as ${nextSession.displayName}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Google sign-in failed.';
        pushToast('error', msg);
        throw err;
      }
    },
    [pushToast, store.employees]
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string, portal: 'dealership' | 'customer') => {
      const trimmedEmail = email.trim().toLowerCase();
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
        pushToast('success', `Signed in to ${portal === 'dealership' ? 'Dealership' : 'Customer'} Portal.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sign-in failed.';
        if (msg.includes('operation-not-allowed') || msg.includes('configuration-not-found')) {
          pushToast(
            'info',
            'Email/Password auth must be enabled in Firebase Console (Authentication > Sign-in method). Use Google Sign-In or Interactive Role Access below.'
          );
        } else {
          pushToast('error', msg);
        }
        throw err;
      }
    },
    [pushToast]
  );

  const registerCustomerAccount = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      password: string;
      preferredLanguage: SupportedLanguage;
    }) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, input.email.trim(), input.password);
        await updateProfile(cred.user, { displayName: input.name.trim() });
        const now = new Date().toISOString();
        const newCust: Customer = {
          id: makeId('cust'),
          userId: cred.user.uid,
          name: input.name.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          preferredLanguage: input.preferredLanguage,
          serviceCredits: 0,
          createdAt: now,
          updatedAt: now,
        };
        mutateStore((prev) => ({ ...prev, customers: [newCust, ...prev.customers] }));
        pushToast('success', 'Customer account created.');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Registration failed.';
        if (msg.includes('operation-not-allowed') || msg.includes('configuration-not-found')) {
          // Register into local shared workspace so the workflow still completes cleanly while informing the user
          const now = new Date().toISOString();
          const localCust: Customer = {
            id: makeId('cust'),
            name: input.name.trim(),
            email: input.email.trim(),
            phone: input.phone.trim(),
            preferredLanguage: input.preferredLanguage,
            serviceCredits: 0,
            createdAt: now,
            updatedAt: now,
          };
          mutateStore((prev) => ({ ...prev, customers: [localCust, ...prev.customers] }));
          const demoSession: ActiveSession = {
            mode: 'demo',
            uid: localCust.id,
            email: localCust.email,
            displayName: localCust.name,
            role: 'customer',
            customerId: localCust.id,
            preferredLanguage: localCust.preferredLanguage,
          };
          setSession(demoSession);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(demoSession));
          pushToast(
            'info',
            'Email/Password provider is not enabled in Firebase Console yet. Created your profile in Interactive Workspace mode.'
          );
          return;
        }
        pushToast('error', msg);
        throw err;
      }
    },
    [mutateStore, pushToast]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        pushToast('success', `Password reset instructions sent to ${email.trim()}.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not send reset email.';
        pushToast('error', msg);
        throw err;
      }
    },
    [pushToast]
  );

  const enterDemoSession = useCallback(
    (role: UserRole, specificId?: string) => {
      let next: ActiveSession;
      if (role === 'customer') {
        const cust =
          store.customers.find((c) => c.id === specificId) ||
          store.customers[0];
        next = {
          mode: 'demo',
          uid: `demo_${cust.id}`,
          email: cust.email,
          displayName: cust.name,
          role: 'customer',
          customerId: cust.id,
          preferredLanguage: cust.preferredLanguage,
        };
      } else {
        const emp =
          store.employees.find((e) => (specificId ? e.id === specificId : e.role === role)) ||
          store.employees[0];
        next = {
          mode: 'demo',
          uid: `demo_${emp.id}`,
          email: emp.email,
          displayName: emp.name,
          role: emp.role,
          employeeId: emp.id,
          preferredLanguage: 'en',
          avatarUrl: emp.avatarUrl,
        };
      }
      setSession(next);
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      pushToast('success', `Active workspace switched to ${next.displayName} (${role.replace('_', ' ')}).`);
    },
    [pushToast, store.customers, store.employees]
  );

  const switchActiveRole = useCallback(
    (role: UserRole, specificId?: string) => {
      if (session?.mode === 'firebase') {
        const emp = store.employees.find((e) => (specificId ? e.id === specificId : e.role === role));
        const cust = store.customers.find((c) => c.id === specificId) || store.customers[0];
        setSession({
          ...session,
          role,
          employeeId: role === 'customer' ? undefined : emp?.id || session.employeeId,
          customerId: role === 'customer' ? cust?.id || 'cust_1' : session.customerId,
          displayName: role === 'customer' ? cust?.name || session.displayName : emp?.name || session.displayName,
        });
        pushToast('info', `Previewing ${role.replace('_', ' ')} workspace.`);
        return;
      }
      enterDemoSession(role, specificId);
    },
    [enterDemoSession, pushToast, session, store.customers, store.employees]
  );

  const logout = useCallback(async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } finally {
      setSession(null);
      window.localStorage.removeItem(SESSION_KEY);
      pushToast('info', 'Signed out cleanly.');
    }
  }, [firebaseUser, pushToast]);

  const seedFirestoreFromDemo = useCallback(async () => {
    if (!canWriteFirestore || !firebaseUser) {
      pushToast('error', 'Sign in with a verified Firebase Admin account first to sync demo data to Firestore.');
      return;
    }
    try {
      const batch = writeBatch(db);
      for (const emp of store.employees) {
        batch.set(doc(db, 'employees', emp.id), {
          ...emp,
          userId: emp.userId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const cust of store.customers) {
        batch.set(doc(db, 'customers', cust.id), {
          ...cust,
          userId: cust.userId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const veh of store.vehicles) {
        batch.set(doc(db, 'vehicles', veh.id), {
          ...veh,
          customerUserId: veh.customerUserId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const apt of store.appointments) {
        batch.set(doc(db, 'appointments', apt.id), {
          ...apt,
          customerUserId: apt.customerUserId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const ro of store.serviceOrders) {
        batch.set(doc(db, 'serviceOrders', ro.id), {
          ...ro,
          customerUserId: ro.customerUserId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const apr of store.approvalRequests) {
        batch.set(doc(db, 'approvalRequests', apr.id), {
          ...apr,
          customerUserId: apr.customerUserId || firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const part of store.circularParts) {
        batch.set(doc(db, 'circularParts', part.id), {
          ...part,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const ntf of store.notifications) {
        batch.set(doc(db, 'notifications', ntf.id), {
          ...ntf,
          customerUserId: ntf.customerUserId || firebaseUser.uid,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      pushToast('success', 'Seeded realistic dealership & customer records to Cloud Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'batch_seed');
    }
  }, [canWriteFirestore, firebaseUser, pushToast, store]);

  const resetDemoStore = useCallback(() => {
    const fresh: SharedStore = {
      employees: SEED_EMPLOYEES,
      customers: SEED_CUSTOMERS,
      vehicles: SEED_VEHICLES,
      appointments: SEED_APPOINTMENTS,
      serviceOrders: SEED_SERVICE_ORDERS,
      approvalRequests: SEED_APPROVAL_REQUESTS,
      circularParts: SEED_CIRCULAR_PARTS,
      notifications: SEED_NOTIFICATIONS,
    };
    setStore(fresh);
    persistLocalStore(fresh);
    pushToast('info', 'Demo dealership dataset restored to initial baseline.');
  }, [persistLocalStore, pushToast]);

  // --- CRUD Actions ---
  const addEmployee = useCallback(
    async (
      input: Omit<
        Employee,
        'id' | 'activeJobCount' | 'completedJobs' | 'averageRating' | 'ratingCount' | 'createdAt' | 'updatedAt'
      >
    ) => {
      const now = new Date().toISOString();
      const created: Employee = {
        ...input,
        id: makeId('emp'),
        skills: input.skills.slice(0, 12),
        activeJobCount: 0,
        completedJobs: 0,
        averageRating: 5.0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      mutateStore((prev) => ({ ...prev, employees: [created, ...prev.employees] }));
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'employees', created.id), {
            ...created,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `employees/${created.id}`);
        }
      }
      pushToast('success', `Registered employee ${created.name} (${created.employeeCode}).`);
      return created;
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const updateEmployee = useCallback(
    async (id: string, patch: Partial<Employee>) => {
      const now = new Date().toISOString();
      mutateStore((prev) => ({
        ...prev,
        employees: prev.employees.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e)),
      }));
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'employees', id), { ...patch, updatedAt: serverTimestamp() });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `employees/${id}`);
        }
      }
      pushToast('success', 'Employee profile updated.');
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const toggleEmployeeActive = useCallback(
    async (id: string) => {
      const target = store.employees.find((e) => e.id === id);
      if (!target) return;
      await updateEmployee(id, {
        isActive: !target.isActive,
        availability: target.isActive ? 'off_duty' : 'available',
      });
    },
    [store.employees, updateEmployee]
  );

  const addCustomer = useCallback(
    async (input: Omit<Customer, 'id' | 'serviceCredits' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const created: Customer = {
        ...input,
        id: makeId('cust'),
        serviceCredits: 0,
        createdAt: now,
        updatedAt: now,
      };
      mutateStore((prev) => ({ ...prev, customers: [created, ...prev.customers] }));
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'customers', created.id), {
            ...created,
            userId: created.userId || firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `customers/${created.id}`);
        }
      }
      pushToast('success', `Customer ${created.name} added.`);
      return created;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast]
  );

  const updateCustomer = useCallback(
    async (id: string, patch: Partial<Customer>) => {
      const now = new Date().toISOString();
      mutateStore((prev) => ({
        ...prev,
        customers: prev.customers.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now } : c)),
      }));
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'customers', id), { ...patch, updatedAt: serverTimestamp() });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `customers/${id}`);
        }
      }
      pushToast('success', 'Customer profile saved.');
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const addVehicle = useCallback(
    async (input: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const created: Vehicle = {
        ...input,
        id: makeId('veh'),
        healthScore: input.healthScore ?? 92,
        createdAt: now,
        updatedAt: now,
      };
      mutateStore((prev) => ({ ...prev, vehicles: [created, ...prev.vehicles] }));
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'vehicles', created.id), {
            ...created,
            customerUserId: created.customerUserId || firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `vehicles/${created.id}`);
        }
      }
      pushToast('success', `Registered ${created.year} ${created.make} ${created.model} (${created.registrationNumber}).`);
      return created;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast]
  );

  const createAppointment = useCallback(
    async (input: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const created: Appointment = {
        ...input,
        id: makeId('apt'),
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
      };
      mutateStore((prev) => ({ ...prev, appointments: [created, ...prev.appointments] }));
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'appointments', created.id), {
            ...created,
            customerUserId: created.customerUserId || firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `appointments/${created.id}`);
        }
      }
      pushToast('success', `Appointment scheduled for ${created.customerName} on ${created.scheduledDate}.`);
      return created;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast]
  );

  const updateAppointmentStatus = useCallback(
    async (id: string, status: Appointment['status']) => {
      const now = new Date().toISOString();
      mutateStore((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === id ? { ...a, status, updatedAt: now } : a)),
      }));
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'appointments', id), { status, updatedAt: serverTimestamp() });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `appointments/${id}`);
        }
      }
      pushToast('info', `Appointment marked as ${status.replace('_', ' ')}.`);
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const createServiceOrder = useCallback(
    async (input: {
      customerId: string;
      vehicleId: string;
      technicianId?: string;
      priority: ServiceOrder['priority'];
      reportedIssues: string;
      estimatedCompletion: string;
      baseEstimate: number;
    }) => {
      const customer = store.customers.find((c) => c.id === input.customerId);
      const vehicle = store.vehicles.find((v) => v.id === input.vehicleId);
      const tech = store.employees.find((e) => e.id === input.technicianId);
      if (!customer || !vehicle) {
        throw new Error('Select a valid customer and vehicle.');
      }

      const now = new Date().toISOString();
      const orderNum = `RO-2026-${Math.floor(4820 + Math.random() * 900)}`;
      const baseCost = Math.max(0, Number(input.baseEstimate) || 0);
      const created: ServiceOrder = {
        id: makeId('ro'),
        orderNumber: orderNum,
        customerId: customer.id,
        customerUserId: customer.userId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        preferredLanguage: customer.preferredLanguage,
        vehicleId: vehicle.id,
        vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        registrationNumber: vehicle.registrationNumber,
        advisorId: session?.employeeId || 'emp_adv_1',
        advisorName: session?.displayName || 'Priya Subramanian',
        technicianId: tech?.id,
        technicianName: tech?.name,
        technicianAvatar: tech?.avatarUrl,
        priority: input.priority,
        stage: 'vehicle_received',
        stageIndex: 0,
        reportedIssues: input.reportedIssues.trim(),
        estimatedCompletion: input.estimatedCompletion.trim(),
        isDelayed: false,
        baseEstimate: baseCost,
        approvedExtrasTotal: 0,
        totalCost: baseCost,
        costBreakdown: [
          {
            id: makeId('cb'),
            label: 'Initial Inspection & Base Service Estimate',
            category: 'labor',
            amount: baseCost,
          },
        ],
        checklist: [
          { id: makeId('chk'), title: 'Vehicle Check-In & Walkaround Photos', completed: true, completedAt: 'Just now' },
          { id: makeId('chk'), title: 'OBD-II Diagnostic Scan & Fault Verification', completed: false },
          { id: makeId('chk'), title: 'Multi-Point Mechanical & Fluid Inspection', completed: false },
          { id: makeId('chk'), title: 'Final Road Test & Quality Sign-Off', completed: false },
        ],
        technicalNotes: [],
        customerUpdates: [
          {
            id: makeId('cu'),
            text: `Your ${vehicle.year} ${vehicle.make} ${vehicle.model} has been checked in under ${orderNum}. ${tech ? `${tech.name} is assigned to your service bay.` : 'A certified technician will be assigned shortly.'}`,
            language: customer.preferredLanguage,
            stage: 'vehicle_received',
            source: 'advisor',
            createdAt: now,
          },
        ],
        media: [],
        maintenanceRecommendations: [],
        partExchangeOptIn: false,
        createdAt: now,
        updatedAt: now,
      };

      mutateStore((prev) => ({
        ...prev,
        serviceOrders: [created, ...prev.serviceOrders],
        employees: tech
          ? prev.employees.map((e) =>
              e.id === tech.id
                ? { ...e, activeJobCount: e.activeJobCount + 1, availability: 'busy', updatedAt: now }
                : e
            )
          : prev.employees,
      }));

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'serviceOrders', created.id), {
            ...created,
            customerUserId: created.customerUserId || firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `serviceOrders/${created.id}`);
        }
      }

      pushToast('success', `Repair Order ${created.orderNumber} opened for ${customer.name}.`);
      return created;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast, session, store.customers, store.employees, store.vehicles]
  );

  const convertAppointmentToOrder = useCallback(
    async (appointmentId: string, technicianId: string, baseEstimate: number) => {
      const apt = store.appointments.find((a) => a.id === appointmentId);
      if (!apt) return null;
      const order = await createServiceOrder({
        customerId: apt.customerId,
        vehicleId: apt.vehicleId,
        technicianId,
        priority: 'standard',
        reportedIssues: apt.reportedIssues || apt.serviceType,
        estimatedCompletion: `${apt.scheduledDate}, 5:30 PM`,
        baseEstimate,
      });
      await updateAppointmentStatus(appointmentId, 'converted');
      return order;
    },
    [createServiceOrder, store.appointments, updateAppointmentStatus]
  );

  const patchServiceOrder = useCallback(
    async (orderId: string, mutator: (order: ServiceOrder) => ServiceOrder, firestoreFields?: Record<string, unknown>) => {
      let updatedOrder: ServiceOrder | null = null;
      mutateStore((prev) => ({
        ...prev,
        serviceOrders: prev.serviceOrders.map((o) => {
          if (o.id !== orderId) return o;
          updatedOrder = mutator(o);
          return updatedOrder;
        }),
      }));

      if (canWriteFirestore && updatedOrder) {
        try {
          await updateDoc(doc(db, 'serviceOrders', orderId), {
            ...(firestoreFields || {}),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `serviceOrders/${orderId}`);
        }
      }
      return updatedOrder;
    },
    [canWriteFirestore, mutateStore]
  );

  const updateOrderStage = useCallback(
    async (orderId: string, stage: RepairStage) => {
      const idx = getStageIndex(stage);
      const now = new Date().toISOString();
      await patchServiceOrder(
        orderId,
        (o) => ({
          ...o,
          stage,
          stageIndex: idx,
          isDelayed: stage === 'ready_for_pickup' ? false : o.isDelayed,
          updatedAt: now,
        }),
        { stage, stageIndex: idx }
      );
      pushToast('success', `Repair stage updated to "${getStageLabel(stage)}".`);
    },
    [patchServiceOrder, pushToast]
  );

  const assignTechnician = useCallback(
    async (orderId: string, technicianId: string) => {
      const tech = store.employees.find((e) => e.id === technicianId);
      if (!tech) return;
      const now = new Date().toISOString();
      await patchServiceOrder(
        orderId,
        (o) => ({
          ...o,
          technicianId: tech.id,
          technicianName: tech.name,
          technicianAvatar: tech.avatarUrl,
          updatedAt: now,
        }),
        {
          technicianId: tech.id,
          technicianName: tech.name,
          technicianAvatar: tech.avatarUrl || '',
        }
      );
      pushToast('success', `Assigned ${tech.name} to repair order.`);
    },
    [patchServiceOrder, pushToast, store.employees]
  );

  const updateOrderEtaAndDelay = useCallback(
    async (orderId: string, estimatedCompletion: string, isDelayed: boolean, delayReason?: string) => {
      const now = new Date().toISOString();
      await patchServiceOrder(
        orderId,
        (o) => ({
          ...o,
          estimatedCompletion: estimatedCompletion.trim(),
          isDelayed,
          delayReason: isDelayed ? (delayReason || '').trim() : '',
          updatedAt: now,
        }),
        {
          estimatedCompletion: estimatedCompletion.trim(),
          isDelayed,
          delayReason: isDelayed ? (delayReason || '').trim() : '',
        }
      );
      pushToast('success', 'Estimated completion time updated.');
    },
    [patchServiceOrder, pushToast]
  );

  const toggleChecklistTask = useCallback(
    async (orderId: string, taskId: string) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order) return;
      const nextChecklist = order.checklist.map((task) =>
        task.id === taskId
          ? {
              ...task,
              completed: !task.completed,
              completedAt: !task.completed
                ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : undefined,
            }
          : task
      );
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, checklist: nextChecklist, updatedAt: new Date().toISOString() }),
        { checklist: nextChecklist }
      );
    },
    [patchServiceOrder, store.serviceOrders]
  );

  const addChecklistTask = useCallback(
    async (orderId: string, title: string) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order || !title.trim()) return;
      const nextChecklist = [
        ...order.checklist,
        { id: makeId('chk'), title: title.trim().slice(0, 140), completed: false },
      ].slice(0, 30);
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, checklist: nextChecklist, updatedAt: new Date().toISOString() }),
        { checklist: nextChecklist }
      );
      pushToast('success', 'Checklist task added.');
    },
    [patchServiceOrder, pushToast, store.serviceOrders]
  );

  const addTechnicalNote = useCallback(
    async (orderId: string, text: string) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order || !text.trim()) return;
      const now = new Date().toISOString();
      const nextNotes = [
        {
          id: makeId('tn'),
          authorName: session?.displayName || order.technicianName || 'Technician',
          text: text.trim().slice(0, 1200),
          stage: order.stage,
          createdAt: now,
        },
        ...order.technicalNotes,
      ].slice(0, 30);
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, technicalNotes: nextNotes, updatedAt: now }),
        { technicalNotes: nextNotes }
      );
      pushToast('success', 'Technical observation recorded.');
    },
    [patchServiceOrder, pushToast, session?.displayName, store.serviceOrders]
  );

  const addCustomerUpdate = useCallback(
    async (
      orderId: string,
      text: string,
      language: SupportedLanguage,
      source: 'gemini' | 'advisor' | 'technician'
    ) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order || !text.trim()) return;
      const now = new Date().toISOString();
      const nextUpdates = [
        {
          id: makeId('cu'),
          text: text.trim().slice(0, 1500),
          language,
          stage: order.stage,
          source,
          createdAt: now,
        },
        ...order.customerUpdates,
      ].slice(0, 30);
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, customerUpdates: nextUpdates, updatedAt: now }),
        { customerUpdates: nextUpdates }
      );
      pushToast('success', 'Customer-facing update published to live portal.');
    },
    [patchServiceOrder, pushToast, store.serviceOrders]
  );

  const uploadOrderMedia = useCallback(
    async (
      orderId: string,
      file: File | null,
      fallbackUrl: string,
      caption: string,
      type: 'image' | 'video'
    ) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order) throw new Error('Repair order not found.');

      let resolvedUrl = fallbackUrl;
      if (file) {
        if (file.size > 12 * 1024 * 1024) {
          throw new Error('File exceeds 12MB upload limit.');
        }
        if (canWriteFirestore) {
          const path = `repair-orders/${orderId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
          const fileRef = storageRef(storage, path);
          await uploadBytes(fileRef, file);
          resolvedUrl = await getDownloadURL(fileRef);
        } else {
          resolvedUrl = URL.createObjectURL(file);
        }
      }

      const now = new Date().toISOString();
      const attachment: MediaAttachment = {
        id: makeId('med'),
        type,
        url: resolvedUrl,
        caption: caption.trim().slice(0, 240) || 'Workshop inspection evidence',
        uploadedBy: session?.displayName || order.technicianName || 'Technician',
        stage: order.stage,
        createdAt: now,
      };
      const nextMedia = [attachment, ...order.media].slice(0, 20);
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, media: nextMedia, updatedAt: now }),
        { media: nextMedia }
      );
      pushToast('success', `${type === 'video' ? 'Video' : 'Photo'} evidence attached to ${order.orderNumber}.`);
      return attachment;
    },
    [canWriteFirestore, patchServiceOrder, pushToast, session?.displayName, store.serviceOrders]
  );

  const updateInspectionInsights = useCallback(
    async (orderId: string, summary: string, recommendations: string[]) => {
      const trimmedRecs = recommendations.slice(0, 15);
      await patchServiceOrder(
        orderId,
        (o) => ({
          ...o,
          inspectionSummary: summary.slice(0, 2000),
          maintenanceRecommendations: trimmedRecs,
          updatedAt: new Date().toISOString(),
        }),
        {
          inspectionSummary: summary.slice(0, 2000),
          maintenanceRecommendations: trimmedRecs,
        }
      );
    },
    [patchServiceOrder]
  );

  const submitCustomerRating = useCallback(
    async (orderId: string, rating: number, feedback: string) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order) return;
      const clamped = Math.min(5, Math.max(1, Math.round(rating)));
      const now = new Date().toISOString();

      await patchServiceOrder(
        orderId,
        (o) => ({
          ...o,
          customerRating: clamped,
          customerFeedback: feedback.trim().slice(0, 1000),
          updatedAt: now,
        }),
        {
          customerRating: clamped,
          customerFeedback: feedback.trim().slice(0, 1000),
        }
      );

      if (order.technicianId) {
        mutateStore((prev) => ({
          ...prev,
          employees: prev.employees.map((e) => {
            if (e.id !== order.technicianId) return e;
            const nextStats = computeNewTechnicianRating(e.averageRating, e.ratingCount, clamped);
            return { ...e, ...nextStats, updatedAt: now };
          }),
        }));
      }

      pushToast('success', 'Thank you! Your technician rating and feedback have been saved.');
    },
    [mutateStore, patchServiceOrder, pushToast, store.serviceOrders]
  );

  const togglePartExchangeOptIn = useCallback(
    async (orderId: string, optIn: boolean) => {
      const order = store.serviceOrders.find((o) => o.id === orderId);
      if (!order) return;
      await patchServiceOrder(
        orderId,
        (o) => ({ ...o, partExchangeOptIn: optIn, updatedAt: new Date().toISOString() }),
        { partExchangeOptIn: optIn }
      );
      if (optIn) {
        mutateStore((prev) => ({
          ...prev,
          customers: prev.customers.map((c) =>
            c.id === order.customerId ? { ...c, serviceCredits: c.serviceCredits + 125 } : c
          ),
        }));
        pushToast('success', 'Opted in to Circular Part Exchange! $125 service credit applied to your account.');
      } else {
        pushToast('info', 'Circular Part Exchange preference updated.');
      }
    },
    [mutateStore, patchServiceOrder, pushToast, store.serviceOrders]
  );

  // --- Approval Requests ---
  const createApprovalRequest = useCallback(
    async (input: {
      serviceOrderId: string;
      title: string;
      description: string;
      estimatedCost: number;
      mediaUrl?: string;
      mediaCaption?: string;
    }) => {
      const order = store.serviceOrders.find((o) => o.id === input.serviceOrderId);
      if (!order) throw new Error('Service order not found.');

      const now = new Date().toISOString();
      const created: ApprovalRequest = {
        id: makeId('apr'),
        serviceOrderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerUserId: order.customerUserId,
        technicianId: order.technicianId,
        technicianName: session?.displayName || order.technicianName || 'Technician',
        title: input.title.trim().slice(0, 160),
        description: input.description.trim().slice(0, 1200),
        estimatedCost: Math.max(0, Number(input.estimatedCost) || 0),
        mediaUrl: input.mediaUrl,
        mediaCaption: input.mediaCaption,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      mutateStore((prev) => ({
        ...prev,
        approvalRequests: [created, ...prev.approvalRequests],
        serviceOrders: prev.serviceOrders.map((o) =>
          o.id === order.id
            ? {
                ...o,
                stage: 'waiting_for_approval',
                stageIndex: getStageIndex('waiting_for_approval'),
                updatedAt: now,
              }
            : o
        ),
      }));

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'approvalRequests', created.id), {
            ...created,
            customerUserId: created.customerUserId || firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'serviceOrders', order.id), {
            stage: 'waiting_for_approval',
            stageIndex: getStageIndex('waiting_for_approval'),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `approvalRequests/${created.id}`);
        }
      }

      pushToast('success', `Additional repair request sent to ${order.customerName} for approval.`);
      return created;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast, session?.displayName, store.serviceOrders]
  );

  const respondToApprovalRequest = useCallback(
    async (requestId: string, decision: 'approved' | 'declined', responseNote?: string) => {
      const req = store.approvalRequests.find((a) => a.id === requestId);
      if (!req) throw new Error('Approval request not found.');
      const order = store.serviceOrders.find((o) => o.id === req.serviceOrderId);
      if (!order) throw new Error('Linked repair order not found.');

      const updatedOrder = applyApprovalDecisionToOrder(order, req, decision);
      const now = new Date().toISOString();

      mutateStore((prev) => ({
        ...prev,
        approvalRequests: prev.approvalRequests.map((a) =>
          a.id === requestId
            ? {
                ...a,
                status: decision,
                customerResponseNote: (responseNote || '').trim().slice(0, 500),
                respondedAt: now,
                updatedAt: now,
              }
            : a
        ),
        serviceOrders: prev.serviceOrders.map((o) => (o.id === order.id ? updatedOrder : o)),
      }));

      if (canWriteFirestore) {
        try {
          const totals = recalculateOrderTotals(updatedOrder.baseEstimate, updatedOrder.costBreakdown);
          await updateDoc(doc(db, 'approvalRequests', requestId), {
            status: decision,
            customerResponseNote: (responseNote || '').trim().slice(0, 500),
            respondedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          await updateDoc(doc(db, 'serviceOrders', order.id), {
            approvedExtrasTotal: totals.approvedExtrasTotal,
            totalCost: totals.totalCost,
            costBreakdown: updatedOrder.costBreakdown,
            stage: updatedOrder.stage,
            stageIndex: updatedOrder.stageIndex,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `approvalRequests/${requestId}`);
        }
      }

      pushToast(
        decision === 'approved' ? 'success' : 'info',
        decision === 'approved'
          ? `Approved "${req.title}". Dealership repair order and total cost updated live.`
          : `Declined "${req.title}". Dealership technician has been notified.`
      );
    },
    [canWriteFirestore, mutateStore, pushToast, store.approvalRequests, store.serviceOrders]
  );

  // --- Circular Parts Exchange ---
  const addCircularPart = useCallback(
    async (input: {
      partName: string;
      category: string;
      condition: CircularPart['condition'];
      compatibleModels: string;
      dealershipName: string;
      inspectionNotes?: string;
      imageUrl?: string;
      creditValue: number;
      co2SavedKg: number;
      sourceOrderId?: string;
      sourceCustomerId?: string;
    }) => {
      if (isSafetyCriticalPart(input.partName, input.category)) {
        const msg =
          'Safety-critical components (airbags, brakes, steering, seatbelts, ABS/structural suspension) are strictly excluded from the Circular Parts Exchange.';
        pushToast('error', msg);
        throw new Error(msg);
      }

      const now = new Date().toISOString();
      const created: CircularPart = {
        id: makeId('cp'),
        partName: input.partName.trim().slice(0, 140),
        category: input.category.trim().slice(0, 80),
        isSafetyCritical: false,
        condition: input.condition,
        compatibleModels: input.compatibleModels.trim().slice(0, 240),
        dealershipName: input.dealershipName.trim().slice(0, 140),
        inspectionNotes: (input.inspectionNotes || '').trim().slice(0, 800),
        imageUrl: input.imageUrl,
        creditValue: Math.max(0, Number(input.creditValue) || 0),
        co2SavedKg: Math.max(0, Number(input.co2SavedKg) || 0),
        sourceOrderId: input.sourceOrderId,
        sourceCustomerId: input.sourceCustomerId,
        status: 'available',
        createdAt: now,
        updatedAt: now,
      };

      mutateStore((prev) => ({ ...prev, circularParts: [created, ...prev.circularParts] }));
      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'circularParts', created.id), {
            ...created,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `circularParts/${created.id}`);
        }
      }
      pushToast('success', `Listed "${created.partName}" in Circular Parts Exchange.`);
      return created;
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const requestCircularPart = useCallback(
    async (partId: string, requestingDealership: string) => {
      const now = new Date().toISOString();
      mutateStore((prev) => ({
        ...prev,
        circularParts: prev.circularParts.map((p) =>
          p.id === partId
            ? {
                ...p,
                status: 'requested',
                requestedByDealership: requestingDealership.trim().slice(0, 140),
                updatedAt: now,
              }
            : p
        ),
      }));
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'circularParts', partId), {
            status: 'requested',
            requestedByDealership: requestingDealership.trim().slice(0, 140),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `circularParts/${partId}`);
        }
      }
      pushToast('success', `Inter-dealership transfer requested for ${requestingDealership}.`);
    },
    [canWriteFirestore, mutateStore, pushToast]
  );

  const completeCircularPartExchange = useCallback(
    async (partId: string) => {
      const part = store.circularParts.find((p) => p.id === partId);
      if (!part) return;
      const now = new Date().toISOString();
      mutateStore((prev) => ({
        ...prev,
        circularParts: prev.circularParts.map((p) =>
          p.id === partId ? { ...p, status: 'exchanged', updatedAt: now } : p
        ),
        customers: part.sourceCustomerId
          ? prev.customers.map((c) =>
              c.id === part.sourceCustomerId
                ? { ...c, serviceCredits: c.serviceCredits + part.creditValue, updatedAt: now }
                : c
            )
          : prev.customers,
      }));
      if (canWriteFirestore) {
        try {
          await updateDoc(doc(db, 'circularParts', partId), {
            status: 'exchanged',
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `circularParts/${partId}`);
        }
      }
      pushToast('success', `Exchange completed and $${part.creditValue} service credit issued.`);
    },
    [canWriteFirestore, mutateStore, pushToast, store.circularParts]
  );

  // --- Notifications (Honest Server Delivery Verification) ---
  const sendNotification = useCallback(
    async (input: {
      serviceOrderId?: string;
      customerId: string;
      recipientName: string;
      recipientContact?: string;
      channel: 'sms' | 'whatsapp' | 'in_app';
      templateType: string;
      message: string;
      estimatedCompletion?: string;
    }) => {
      let deliveryStatus: NotificationLog['deliveryStatus'] = 'in_app_logged';
      let providerMessage = 'Published to Customer Portal.';

      try {
        const resp = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: input.channel,
            to: input.recipientContact,
            message: input.message,
          }),
        });
        const data = (await resp.json()) as {
          deliveryStatus?: NotificationLog['deliveryStatus'];
          providerMessage?: string;
          error?: string;
        };
        deliveryStatus = data.deliveryStatus || (resp.ok ? 'delivered' : 'failed');
        providerMessage = data.providerMessage || data.error || providerMessage;
      } catch (err) {
        deliveryStatus = 'failed';
        providerMessage = err instanceof Error ? err.message : 'Notification endpoint unreachable.';
      }

      const now = new Date().toISOString();
      const log: NotificationLog = {
        id: makeId('ntf'),
        serviceOrderId: input.serviceOrderId,
        customerId: input.customerId,
        recipientName: input.recipientName,
        recipientContact: input.recipientContact,
        channel: input.channel,
        templateType: input.templateType,
        message: input.message.slice(0, 1200),
        estimatedCompletion: input.estimatedCompletion,
        deliveryStatus,
        providerMessage,
        sentByName: session?.displayName || 'Dealership Staff',
        createdAt: now,
      };

      mutateStore((prev) => ({ ...prev, notifications: [log, ...prev.notifications] }));

      if (canWriteFirestore) {
        try {
          await setDoc(doc(db, 'notifications', log.id), {
            ...log,
            customerUserId: firebaseUser?.uid || '',
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `notifications/${log.id}`);
        }
      }

      if (deliveryStatus === 'not_configured') {
        pushToast('info', `${input.channel.toUpperCase()} provider is not configured on the server. Recorded honestly in communication history.`);
      } else if (deliveryStatus === 'failed') {
        pushToast('error', `Delivery failed: ${providerMessage}`);
      } else {
        pushToast('success', providerMessage);
      }

      return log;
    },
    [canWriteFirestore, firebaseUser?.uid, mutateStore, pushToast, session?.displayName]
  );

  // --- Server-Side Gemini AI Actions ---
  const generateFriendlyUpdate = useCallback(
    async (params: {
      technicalNote: string;
      language: SupportedLanguage;
      stageLabel: string;
      vehicleLabel: string;
      estimatedCompletion: string;
    }) => {
      const resp = await fetch('/api/gemini/translate-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = (await resp.json()) as { customerUpdate?: string; error?: string };
      if (!resp.ok || !data.customerUpdate) {
        const errText = data.error || 'Gemini could not translate the note right now.';
        pushToast('error', errText);
        throw new Error(errText);
      }
      return data.customerUpdate;
    },
    [pushToast]
  );

  const askServiceAssistant = useCallback(
    async (params: {
      question: string;
      language: SupportedLanguage;
      order: ServiceOrder;
      approvals: ApprovalRequest[];
      history: { role: 'user' | 'assistant'; text: string }[];
    }) => {
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: params.question,
          language: params.language,
          history: params.history,
          orderContext: {
            orderNumber: params.order.orderNumber,
            vehicle: params.order.vehicleLabel,
            registrationNumber: params.order.registrationNumber,
            stage: getStageLabel(params.order.stage),
            priority: params.order.priority,
            estimatedCompletion: params.order.estimatedCompletion,
            isDelayed: params.order.isDelayed,
            delayReason: params.order.delayReason || null,
            technicianName: params.order.technicianName || 'Pending assignment',
            advisorName: params.order.advisorName || 'Dealership Service Desk',
            reportedIssues: params.order.reportedIssues,
            baseEstimateUSD: params.order.baseEstimate,
            approvedExtrasUSD: params.order.approvedExtrasTotal,
            totalCostUSD: params.order.totalCost,
            costBreakdown: params.order.costBreakdown,
            checklist: params.order.checklist,
            technicalNotes: params.order.technicalNotes,
            customerUpdates: params.order.customerUpdates,
            inspectionSummary: params.order.inspectionSummary || null,
            maintenanceRecommendations: params.order.maintenanceRecommendations,
            approvalRequests: params.approvals.map((a) => ({
              title: a.title,
              description: a.description,
              estimatedCostUSD: a.estimatedCost,
              status: a.status,
            })),
          },
        }),
      });
      const data = (await resp.json()) as { answer?: string; error?: string };
      if (!resp.ok || !data.answer) {
        const errText = data.error || 'Unable to contact Gemini Service Assistant.';
        pushToast('error', errText);
        throw new Error(errText);
      }
      return data.answer;
    },
    [pushToast]
  );

  const generateInspectionSummary = useCallback(
    async (params: { order: ServiceOrder; language: SupportedLanguage }) => {
      const resp = await fetch('/api/gemini/inspection-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: params.language,
          orderContext: {
            vehicle: params.order.vehicleLabel,
            stage: getStageLabel(params.order.stage),
            reportedIssues: params.order.reportedIssues,
            checklist: params.order.checklist,
            technicalNotes: params.order.technicalNotes,
          },
        }),
      });
      const data = (await resp.json()) as {
        summary?: string;
        recommendations?: string[];
        error?: string;
      };
      if (!resp.ok || !data.summary) {
        const errText = data.error || 'Unable to generate inspection summary.';
        pushToast('error', errText);
        throw new Error(errText);
      }
      await updateInspectionInsights(params.order.id, data.summary, data.recommendations || []);
      pushToast('success', 'Inspection summary and maintenance insights updated.');
      return {
        summary: data.summary,
        recommendations: data.recommendations || [],
      };
    },
    [pushToast, updateInspectionInsights]
  );

  const value = useMemo<ServiceContextValue>(
    () => ({
      authReady,
      firebaseUser,
      session,
      firestoreConnected,
      integrations,
      toasts,
      dismissToast,
      pushToast,
      employees: store.employees,
      customers: store.customers,
      vehicles: store.vehicles,
      appointments: store.appointments,
      serviceOrders: store.serviceOrders,
      approvalRequests: store.approvalRequests,
      circularParts: store.circularParts,
      notifications: store.notifications,
      loginWithGoogle,
      loginWithEmail,
      registerCustomerAccount,
      sendPasswordReset,
      enterDemoSession,
      switchActiveRole,
      logout,
      seedFirestoreFromDemo,
      resetDemoStore,
      addEmployee,
      updateEmployee,
      toggleEmployeeActive,
      addCustomer,
      updateCustomer,
      addVehicle,
      createAppointment,
      updateAppointmentStatus,
      convertAppointmentToOrder,
      createServiceOrder,
      updateOrderStage,
      assignTechnician,
      updateOrderEtaAndDelay,
      toggleChecklistTask,
      addChecklistTask,
      addTechnicalNote,
      addCustomerUpdate,
      uploadOrderMedia,
      updateInspectionInsights,
      submitCustomerRating,
      togglePartExchangeOptIn,
      createApprovalRequest,
      respondToApprovalRequest,
      addCircularPart,
      requestCircularPart,
      completeCircularPartExchange,
      sendNotification,
      generateFriendlyUpdate,
      askServiceAssistant,
      generateInspectionSummary,
    }),
    [
      authReady,
      firebaseUser,
      session,
      firestoreConnected,
      integrations,
      toasts,
      dismissToast,
      pushToast,
      store,
      loginWithGoogle,
      loginWithEmail,
      registerCustomerAccount,
      sendPasswordReset,
      enterDemoSession,
      switchActiveRole,
      logout,
      seedFirestoreFromDemo,
      resetDemoStore,
      addEmployee,
      updateEmployee,
      toggleEmployeeActive,
      addCustomer,
      updateCustomer,
      addVehicle,
      createAppointment,
      updateAppointmentStatus,
      convertAppointmentToOrder,
      createServiceOrder,
      updateOrderStage,
      assignTechnician,
      updateOrderEtaAndDelay,
      toggleChecklistTask,
      addChecklistTask,
      addTechnicalNote,
      addCustomerUpdate,
      uploadOrderMedia,
      updateInspectionInsights,
      submitCustomerRating,
      togglePartExchangeOptIn,
      createApprovalRequest,
      respondToApprovalRequest,
      addCircularPart,
      requestCircularPart,
      completeCircularPartExchange,
      sendNotification,
      generateFriendlyUpdate,
      askServiceAssistant,
      generateInspectionSummary,
    ]
  );

  return <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>;
};

export function useService() {
  const ctx = useContext(ServiceContext);
  if (!ctx) throw new Error('useService must be used inside ServiceProvider');
  return ctx;
}
