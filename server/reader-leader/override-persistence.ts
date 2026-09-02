import { AppendOnlyOverrideInput } from "@shared/contracts/reader-leader";
import { getSupabaseAdminClient } from "../supabase";

const allowedReviewerRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ManusActor = {
  openId: string;
  email?: string | null;
  name?: string | null;
};
export type ReviewerContext = { role: string; userId: string };

type ActorInput = string | ManusActor;

function actorDetails(actor: ActorInput) {
  return typeof actor === "string" ? { openId: actor, email: null, name: null } : actor;
}

export async function resolveSupabaseUserId(actor: ActorInput): Promise<string> {
  const { openId, email } = actorDetails(actor);
  if (uuidPattern.test(openId)) return openId;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("reader_leader_actor_links").select("supabase_user_id").eq("manus_open_id", openId).maybeSingle();
  if (data?.supabase_user_id) return data.supabase_user_id;
  if (error && error.code !== "PGRST116") throw new Error("Unable to resolve authenticated actor link");
  if (!email) throw new Error("Authenticated actor is not linked to a Supabase user");

  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw new Error("Unable to resolve authenticated actor link");
  const matchingUser = users.users.find(user => user.email?.toLowerCase() === email.toLowerCase());
  if (!matchingUser) throw new Error("Authenticated actor is not linked to a Supabase user");

  const { error: linkError } = await admin.from("reader_leader_actor_links").upsert({ manus_open_id: openId, supabase_user_id: matchingUser.id }, { onConflict: "manus_open_id" });
  if (linkError) throw new Error("Unable to persist authenticated actor link");
  return matchingUser.id;
}

export async function resolveDecisionOrganisation(decisionId: string): Promise<string> {
  const { data, error } = await getSupabaseAdminClient().from("agent_decisions").select("session_id, reading_sessions!inner(organisation_id)").eq("id", decisionId).single();
  const organisationId = (data?.reading_sessions as { organisation_id?: string } | null)?.organisation_id;
  if (error || !organisationId) throw new Error("Decision organisation could not be resolved");
  return organisationId;
}

export async function resolveReviewerContext(actor: ActorInput, organisationId: string): Promise<ReviewerContext> {
  const userId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient().from("memberships").select("user_id, role").eq("user_id", userId).eq("organisation_id", organisationId).maybeSingle();
  if (error || !data) throw new Error("No Reader Leader membership found for authenticated actor");
  return { userId: data.user_id, role: data.role };
}

export async function persistHumanOverride(input: unknown, reviewer: ReviewerContext) {
  const override = AppendOnlyOverrideInput.parse(input);
  if (!allowedReviewerRoles.has(reviewer.role)) throw new Error("Only authorised teacher or admin reviewers may create overrides");
  if (override.reviewerId !== reviewer.userId) throw new Error("Reviewer identity does not match the authenticated actor");
  const supabase = getSupabaseAdminClient();
  const { data: decision, error: decisionError } = await supabase.from("agent_decisions").select("id, session_id, reading_sessions!inner(organisation_id)").eq("id", override.agentDecisionId).single();
  if (decisionError || !decision) throw new Error("Decision was not found in an accessible organisation");
  const organisationId = (decision.reading_sessions as { organisation_id?: string } | null)?.organisation_id;
  if (!organisationId) throw new Error("Decision organisation could not be resolved");
  const { data: membership, error: membershipError } = await supabase.from("memberships").select("role").eq("user_id", reviewer.userId).eq("organisation_id", organisationId).maybeSingle();
  if (membershipError || !membership || !allowedReviewerRoles.has(membership.role)) throw new Error("Reviewer is not authorised for this decision organisation");
  const { data, error } = await supabase.from("human_reviews").insert({ agent_decision_id: override.agentDecisionId, reviewer_id: override.reviewerId, override_action: override.overrideAction, reason: override.reason, idempotency_key: override.idempotencyKey }).select("id, agent_decision_id, reviewer_id, override_action, reason, idempotency_key, created_at").single();
  if (error) { if (error.code === "23505") throw new Error("Override idempotency key has already been used"); throw new Error(`Override persistence failed: ${error.message}`); }
  return data;
}
