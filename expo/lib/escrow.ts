import AsyncStorage from "@react-native-async-storage/async-storage";

export type EscrowStatus =
  | "pending"
  | "held"
  | "released"
  | "refunded"
  | "disputed";

export type EscrowMethod = "paynow" | "ecocash" | "card";

export interface EscrowRecord {
  id: string;
  jobId: string;
  payerId: string;
  payeeId: string | null;
  amount: number;
  totalJobValue: number;
  depositPercentage: number;
  method: EscrowMethod;
  status: EscrowStatus;
  createdAt: string;
  heldAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
  txnRef: string;
  events: { at: string; type: string; note?: string }[];
}

const STORAGE_KEY = "freight-connect:escrow";

async function readAll(): Promise<EscrowRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EscrowRecord[];
  } catch (e) {
    console.log("escrow read error", e);
    return [];
  }
}

async function writeAll(records: EscrowRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateTxnRef(): string {
  const d = new Date();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}-${rand}`;
}

export async function createEscrow(input: {
  jobId: string;
  payerId: string;
  payeeId: string | null;
  totalJobValue: number;
  depositPercentage: number;
  method: EscrowMethod;
}): Promise<EscrowRecord> {
  const all = await readAll();
  const amount = Math.round(
    (input.totalJobValue * input.depositPercentage) / 100 * 100
  ) / 100;
  const now = new Date().toISOString();
  const record: EscrowRecord = {
    id: `esc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    jobId: input.jobId,
    payerId: input.payerId,
    payeeId: input.payeeId,
    amount,
    totalJobValue: input.totalJobValue,
    depositPercentage: input.depositPercentage,
    method: input.method,
    status: "pending",
    createdAt: now,
    heldAt: null,
    releasedAt: null,
    refundedAt: null,
    txnRef: generateTxnRef(),
    events: [{ at: now, type: "created", note: "Escrow initialized" }],
  };
  await writeAll([record, ...all]);
  console.log("[escrow] created", record.id, record.amount, record.method);
  return record;
}

export async function confirmPayment(escrowId: string): Promise<EscrowRecord | null> {
  const all = await readAll();
  const idx = all.findIndex((r) => r.id === escrowId);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const updated: EscrowRecord = {
    ...all[idx],
    status: "held",
    heldAt: now,
    events: [
      ...all[idx].events,
      { at: now, type: "held", note: "Funds held in escrow" },
    ],
  };
  all[idx] = updated;
  await writeAll(all);
  console.log("[escrow] held", escrowId);
  return updated;
}

export async function releaseEscrow(escrowId: string): Promise<EscrowRecord | null> {
  const all = await readAll();
  const idx = all.findIndex((r) => r.id === escrowId);
  if (idx === -1) return null;
  if (all[idx].status !== "held") {
    console.log("[escrow] cannot release, status=", all[idx].status);
    return all[idx];
  }
  const now = new Date().toISOString();
  const updated: EscrowRecord = {
    ...all[idx],
    status: "released",
    releasedAt: now,
    events: [
      ...all[idx].events,
      { at: now, type: "released", note: "Released to driver EcoCash" },
    ],
  };
  all[idx] = updated;
  await writeAll(all);
  console.log("[escrow] released", escrowId);
  return updated;
}

export async function refundEscrow(
  escrowId: string,
  reason?: string
): Promise<EscrowRecord | null> {
  const all = await readAll();
  const idx = all.findIndex((r) => r.id === escrowId);
  if (idx === -1) return null;
  if (all[idx].status === "released") {
    console.log("[escrow] cannot refund, already released");
    return all[idx];
  }
  const now = new Date().toISOString();
  const updated: EscrowRecord = {
    ...all[idx],
    status: "refunded",
    refundedAt: now,
    events: [
      ...all[idx].events,
      { at: now, type: "refunded", note: reason || "Refunded to payer" },
    ],
  };
  all[idx] = updated;
  await writeAll(all);
  console.log("[escrow] refunded", escrowId);
  return updated;
}

export async function getEscrowByJob(jobId: string): Promise<EscrowRecord | null> {
  const all = await readAll();
  return all.find((r) => r.jobId === jobId) || null;
}

export async function listEscrows(userId?: string): Promise<EscrowRecord[]> {
  const all = await readAll();
  if (!userId) return all;
  return all.filter((r) => r.payerId === userId || r.payeeId === userId);
}
