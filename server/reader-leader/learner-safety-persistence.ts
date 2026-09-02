import { getSupabaseAdminClient } from "../supabase";
import { LearnerRecord, LearnerSafetyWorkspace, TimelineEntry, TimelinePage, TimelinePageInput, AuditEntry, OverrideReversalInput } from "@shared/learner-safety-persistence";
import { resolveSupabaseUserId } from "./override-persistence";

const teacherRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);

async function membershipsFor(manusOpenId: string) {
  const userId = await resolveSupabaseUserId(manusOpenId);
  const { data, error } = await getSupabaseAdminClient().from("memberships").select("organisation_id, role").eq("user_id", userId);
  if (error) throw new Error("Unable to resolve learner-safety membership");
  return { userId, memberships: data ?? [] };
}

async function learnerFor(manusOpenId: string, learnerId: string) {
  const { userId, memberships } = await membershipsFor(manusOpenId);
  const organisationIds = memberships.map(row => row.organisation_id);
  const { data, error } = await getSupabaseAdminClient().from("learners").select("id, display_name, safe_label, organisation_id").eq("id", learnerId).in("organisation_id", organisationIds).single();
  if (error || !data) throw new Error("Learner is not available to this account");
  return { userId, learner: LearnerRecord.parse(data), memberships };
}

export async function listLearnersForActor(manusOpenId: string) {
  const { memberships } = await membershipsFor(manusOpenId);
  const organisationIds = memberships.map(row => row.organisation_id);
  if (!organisationIds.length) return [];
  const { data, error } = await getSupabaseAdminClient().from("learners").select("id, display_name, safe_label, organisation_id").in("organisation_id", organisationIds).order("display_name");
  if (error) throw new Error("Unable to load learners");
  return (data ?? []).map(row => LearnerRecord.parse(row));
}

export async function getLearnerTimelinePage(manusOpenId: string, input: TimelinePageInput): Promise<TimelinePage> {
  await learnerFor(manusOpenId, input.learnerId);
  const from = (input.page - 1) * input.pageSize;
  const to = from + input.pageSize - 1;
  const { data, count, error } = await getSupabaseAdminClient().from("learner_safety_decisions").select("id, learner_id, action, status, summary, created_at, override_id", { count: "exact" }).eq("learner_id", input.learnerId).order("created_at", { ascending: false }).range(from, to);
  if (error) throw new Error("Unable to load decision timeline");
  const items = (data ?? []).map(row => TimelineEntry.parse({ ...row, createdAt: row.created_at, overrideId: row.override_id ?? null }));
  const total = count ?? items.length;
  return TimelinePage.parse({ items, page: input.page, pageSize: input.pageSize, total, nextPage: input.page * input.pageSize < total ? input.page + 1 : null });
}

export async function getLearnerWorkspace(manusOpenId: string, learnerId: string): Promise<LearnerSafetyWorkspace> {
  const { userId, learner, memberships } = await learnerFor(manusOpenId, learnerId);
  const canManage = memberships.some(row => row.organisation_id === learner.organisationId && teacherRoles.has(row.role));
  const client = getSupabaseAdminClient();
  const { data: decisions, error: decisionsError } = await client.from("learner_safety_decisions").select("id, learner_id, action, status, summary, created_at, override_id").eq("learner_id", learnerId).order("created_at", { ascending: false });
  if (decisionsError) throw new Error("Unable to load decision timeline");
  const timeline = (decisions ?? []).map(row => TimelineEntry.parse({ ...row, createdAt: row.created_at, overrideId: row.override_id ?? null }));
  let audit: AuditEntry[] = [];
  if (canManage) {
    const { data: events, error: auditError } = await client.from("learner_safety_events").select("id, actor_id, learner_id, event_type, summary, created_at").eq("learner_id", learnerId).order("created_at", { ascending: false });
    if (auditError) throw new Error("Unable to load audit history");
    audit = (events ?? []).map(row => AuditEntry.parse({ ...row, actorId: row.actor_id, eventType: row.event_type, createdAt: row.created_at }));
  }
  void userId;
  return LearnerSafetyWorkspace.parse({ learner, timeline, audit, canManage });
}

export async function reverseOverride(manusOpenId: string, input: OverrideReversalInput) {
  const { data: existing, error } = await getSupabaseAdminClient().from("learner_safety_events").select("id, learner_id, organisation_id").eq("id", input.overrideId).single();
  if (error || !existing) throw new Error("Override event was not found");
  const { userId, memberships } = await learnerFor(manusOpenId, existing.learner_id);
  if (!memberships.some(row => row.organisation_id === existing.organisation_id && teacherRoles.has(row.role))) throw new Error("Only authorised teachers can reverse overrides");
  const { data, error: insertError } = await getSupabaseAdminClient().from("learner_safety_events").insert({ learner_id: existing.learner_id, organisation_id: existing.organisation_id, actor_id: userId, event_type: "OVERRIDE_REVERSED", summary: input.reason, idempotency_key: input.idempotencyKey }).select("id, learner_id, actor_id, event_type, summary, created_at").single();
  if (insertError || !data) throw new Error(insertError?.code === "23505" ? "Reversal idempotency key already exists" : "Unable to append reversal");
  return AuditEntry.parse({ ...data, actorId: data.actor_id, eventType: data.event_type, createdAt: data.created_at });
}
