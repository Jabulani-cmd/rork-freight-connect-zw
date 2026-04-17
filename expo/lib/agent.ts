import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AgentProfile {
  userId: string;
  referralCode: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  agentCode: string;
  referredUserId: string;
  referredUserName: string;
  referredRole: "cargo_owner" | "driver";
  subscriptionTier: string | null;
  monthlyAmount: number;
  isPaying: boolean;
  cashPaid: boolean;
  signedUpAt: string;
  paidMonths: number;
}

const AGENT_KEY = "freight-connect:agent-profile";
const REFS_KEY = "freight-connect:referrals";
const APPLIED_CODE_KEY = "freight-connect:applied-referral";

function randCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `FC-${out}`;
}

export async function getOrCreateAgent(userId: string): Promise<AgentProfile> {
  const raw = await AsyncStorage.getItem(AGENT_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as AgentProfile;
    if (parsed.userId === userId) return parsed;
  }
  const profile: AgentProfile = {
    userId,
    referralCode: randCode(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(AGENT_KEY, JSON.stringify(profile));
  return profile;
}

export async function listReferrals(): Promise<Referral[]> {
  const raw = await AsyncStorage.getItem(REFS_KEY);
  return raw ? (JSON.parse(raw) as Referral[]) : [];
}

export async function addReferral(r: Omit<Referral, "id" | "signedUpAt" | "paidMonths">): Promise<Referral> {
  const list = await listReferrals();
  const record: Referral = {
    ...r,
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    signedUpAt: new Date().toISOString(),
    paidMonths: r.isPaying ? 1 : 0,
  };
  await AsyncStorage.setItem(REFS_KEY, JSON.stringify([record, ...list]));
  return record;
}

export async function markReferralPaying(id: string, tier: string, amount: number, cashPaid: boolean): Promise<void> {
  const list = await listReferrals();
  const next = list.map((r) =>
    r.id === id
      ? {
          ...r,
          isPaying: true,
          subscriptionTier: tier,
          monthlyAmount: amount,
          cashPaid,
          paidMonths: Math.max(r.paidMonths, 1),
        }
      : r
  );
  await AsyncStorage.setItem(REFS_KEY, JSON.stringify(next));
}

export async function applyReferralCode(code: string): Promise<void> {
  await AsyncStorage.setItem(APPLIED_CODE_KEY, code.trim().toUpperCase());
}

export async function getAppliedReferralCode(): Promise<string | null> {
  return AsyncStorage.getItem(APPLIED_CODE_KEY);
}

export interface CommissionBreakdown {
  totalRecruited: number;
  activePaying: number;
  driversCount: number;
  cargoOwnersCount: number;
  commissionThisMonth: number;
  bonusThisMonth: number;
  lifetimeCommission: number;
}

export function computeCommission(referrals: Referral[]): CommissionBreakdown {
  let commissionThisMonth = 0;
  let lifetime = 0;
  let activePaying = 0;
  let drivers = 0;
  let cargo = 0;
  for (const r of referrals) {
    if (r.referredRole === "driver") drivers++;
    else cargo++;
    if (!r.isPaying) continue;
    activePaying++;
    const rate = r.referredRole === "driver" ? 0.2 : 0.15;
    const withinFirst3 = r.paidMonths <= 3;
    if (withinFirst3) {
      commissionThisMonth += r.monthlyAmount * rate;
    }
    lifetime += r.monthlyAmount * rate * Math.min(r.paidMonths, 3);
  }
  let bonus = 0;
  if (activePaying >= 100) bonus = 120;
  else if (activePaying >= 50) bonus = 50;
  return {
    totalRecruited: referrals.length,
    activePaying,
    driversCount: drivers,
    cargoOwnersCount: cargo,
    commissionThisMonth,
    bonusThisMonth: bonus,
    lifetimeCommission: lifetime + bonus,
  };
}
