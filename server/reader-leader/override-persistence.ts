import { AppendOnlyOverrideInput } from "@shared/contracts/reader-leader";
import { getSupabaseAdminClient } from "../supabase";

const allowedReviewerRoles = new Set(["school_admin", "literacy_lead", "teacher_set"]);
export type ReviewerContext = { role: string; userId: string };

export async function resolveDecisionOrganisation(decisionId: string): Promise<string> {
  const { data, error } = await getSupabaseAdminClient()
    .from("agent_decisions")
    .select("session_id, reading_sessions!inner(organisation_id)")
    .eq("id", decisionId)
    .single();
  const organisationId = (data?.reading_sessions as { organisation_id?: string } | null)?.organisation_id;
  if (error || !organisationId) throw new Error("Decision organisation could not be resolved");
  return organisationId;
}

export async function resolveReviewerContext(userId: string, organisationId: string): Promise<ReviewerContext> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memberships")
    .select("user_id, role")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (error || !data) throw new Error("No Reader Leader membership found for authenticated actor");
  return { userId: data.user_id, role: data.role };
}

export async function persistHumanOverride(input: unknown, reviewer: ReviewerContext) {
  const override = AppendOnlyOverrideInput.parse(input);
  if (!allowedReviewerRoles.has(reviewer.role)) {
    throw new Error("Only authorised teacher or admin reviewers may create overrides");
  }
  if (override.reviewerId !== reviewer.userId) {
    throw new Error("Reviewer identity does not match the authenticated actor");
  }

  const supabase = getSupabaseAdminClient();
  const { data: decision, error: decisionError } = await supabase
    .from("agent_decisions")
    .select("id, session_id, reading_sessions!inner(organisation_id)")
    .eq("id", override.agentDecisionId)
    .single();
  if (decisionError || !decision) throw new Error("Decision was not found in an accessible organisation");

  const organisationId = (decision.reading_sessions as { organisation_id?: string } | null)?.organisation_id;
  if (!organisationId) throw new Error("Decision organisation could not be resolved");

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", reviewer.userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  if (membershipError || !membership || !allowedReviewerRoles.has(membership.role)) {
    throw new Error("Reviewer is not authorised for this decision organisation");
  }

  const { data, error } = await supabase
    .from("human_reviews")
    .insert({
      agent_decision_id: override.agentDecisionId,
      reviewer_id: override.reviewerId,
      override_action: override.overrideAction,
      reason: override.reason,
      idempotency_key: override.idempotencyKey,
    })
    .select("id, agent_decision_id, reviewer_id, override_action, reason, idempotency_key, created_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Override idempotency key has already been used");
    throw new Error(`Override persistence failed: ${error.message}`);
  }
  return data;
}
