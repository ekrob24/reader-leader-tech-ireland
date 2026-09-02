import { getSupabaseAdminClient } from "../supabase";
import { LearnerRecord, LearnerSafetyWorkspace, TimelineEntry, TimelinePage, TimelinePageInput, AuditEntry, OverrideReversalInput } from "@shared/learner-safety-persistence";
import { ManusActor, resolveSupabaseUserId } from "./override-persistence";

const teacherRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);

export function parseLearnerRow(row: Record<string, unknown>) {
  return LearnerRecord.parse({
    id: row.id,
    displayName: row.display_name ?? row.displayName,
    safeLabel: row.safe_label ?? row.safeLabel,
    organisationId: row.organisation_id ?? row.organisationId,
  });
}

export function normalizeIsoTimestamp(value: unknown, fieldName = "createdAt") {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new Error(`Invalid ${fieldName} timestamp from Supabase`);
  return date.toISOString();
}

export function parseTimelineRow(row: Record<string, unknown>) {
  return TimelineEntry.parse({
    id: row.id,
    learnerId: row.learner_id ?? row.learnerId,
    action: row.action,
    status: row.status,
    summary: row.summary,
    createdAt: normalizeIsoTimestamp(row.created_at ?? row.createdAt),
    overrideId: row.override_id ?? row.overrideId ?? null,
  });
}

export function parseAuditRow(row: Record<string, unknown>) {
  return AuditEntry.parse({
    id: row.id,
    actorId: row.actor_id ?? row.actorId,
    learnerId: row.learner_id ?? row.learnerId,
    eventType: row.event_type ?? row.eventType,
    summary: row.summary,
    createdAt: normalizeIsoTimestamp(row.created_at ?? row.createdAt),
  });
}

async function membershipsFor(actor: ManusActor) {
  const userId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient().from("memberships").select("organisation_id, role").eq("user_id", userId);
  if (error) throw new Error("Unable to resolve learner-safety membership");
  return { userId, memberships: data ?? [] };
}

async function learnerFor(actor: ManusActor, learnerId: string) {
  const { userId, memberships } = await membershipsFor(actor);
  const organisationIds = memberships.map(row => row.organisation_id);
  const { data, error } = await getSupabaseAdminClient().from("learners").select("id, display_name, safe_label, organisation_id").eq("id", learnerId).in("organisation_id", organisationIds).single();
  if (error || !data) throw new Error("Learner is not available to this account");
  return { userId, learner: parseLearnerRow(data as Record<string, unknown>), memberships };
}

export async function listLearnersForActor(actor: ManusActor) {
  const { memberships } = await membershipsFor(actor);
  const organisationIds = memberships.map(row => row.organisation_id);
  if (!organisationIds.length) return [];
  const { data, error } = await getSupabaseAdminClient().from("learners").select("id, display_name, safe_label, organisation_id").in("organisation_id", organisationIds).order("display_name");
  if (error) throw new Error("Unable to load learners");
  return (data ?? []).map(row => parseLearnerRow(row as Record<string, unknown>));
}

export async function getLearnerTimelinePage(actor: ManusActor, input: TimelinePageInput): Promise<TimelinePage> {
  await learnerFor(actor, input.learnerId);
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  const { data, count, error } = await getSupabaseAdminClient().from("learner_safety_decisions").select("id, learner_id, action, status, summary, created_at, override_id", { count: "exact" }).eq("learner_id", input.learnerId).order("created_at", { ascending: false }).range(from, to);
  if (error) throw new Error("Unable to load decision timeline");
  const items = (data ?? []).map(row => parseTimelineRow(row as Record<string, unknown>));
  const total = count ?? items.length;
  return TimelinePage.parse({ items, page: input.page, pageSize: input.pageSize, total, nextPage: input.page * input.pageSize < total ? input.page + 1 : null });
}

export async function getLearnerWorkspace(actor: ManusActor, learnerId: string): Promise<LearnerSafetyWorkspace> {
  const { userId, learner, memberships } = await learnerFor(actor, learnerId);
  const canManage = memberships.some(row => row.organisation_id === learner.organisationId && teacherRoles.has(row.role));
  const client = getSupabaseAdminClient();
  const { data: decisions, error: decisionsError } = await client.from("learner_safety_decisions").select("id, learner_id, action, status, summary, created_at, override_id").eq("learner_id", learnerId).order("created_at", { ascending: false });
  if (decisionsError) throw new Error("Unable to load decision timeline");
  const timeline = (decisions ?? []).map(row => parseTimelineRow(row as Record<string, unknown>));
  let audit: AuditEntry[] = [];
  if (canManage) {
    const { data: events, error: auditError } = await client.from("learner_safety_events").select("id, actor_id, learner_id, event_type, summary, created_at").eq("learner_id", learnerId).order("created_at", { ascending: false });
    if (auditError) throw new Error("Unable to load audit history");
    audit = (events ?? []).map(row => parseAuditRow(row as Record<string, unknown>));
  }
  void userId;
  return LearnerSafetyWorkspace.parse({ learner, timeline, audit, canManage });
}

export async function reverseOverride(actor: ManusActor, input: OverrideReversalInput) {
  const { data: existing, error } = await getSupabaseAdminClient().from("learner_safety_events").select("id, learner_id, organisation_id").eq("id", input.overrideId).single();
  if (error || !existing) throw new Error("Override event was not found");
  const { userId, memberships } = await learnerFor(actor, existing.learner_id);
  if (!memberships.some(row => row.organisation_id === existing.organisation_id && teacherRoles.has(row.role))) throw new Error("Only authorised teachers can reverse overrides");
  const { data, error: insertError } = await getSupabaseAdminClient().from("learner_safety_events").insert({ learner_id: existing.learner_id, organisation_id: existing.organisation_id, actor_id: userId, event_type: "OVERRIDE_REVERSED", summary: input.reason, idempotency_key: input.idempotencyKey }).select("id, learner_id, actor_id, event_type, summary, created_at").single();
  if (insertError || !data) throw new Error(insertError?.code === "23505" ? "Reversal idempotency key already exists" : "Unable to append reversal");
  return parseAuditRow(data as Record<string, unknown>);
}
