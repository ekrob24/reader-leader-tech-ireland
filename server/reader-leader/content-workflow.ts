import {
  ApprovePassageInput,
  ContentOrganisationContext,
  ContentWorkflowOverview,
  ContentReviewEvent,
  CreatePassageDraftInput,
  PassageWorkflowItem,
  RetirePassageInput,
  SetPassageRightsInput,
  SetPassageSafetyInput,
} from "@shared/content-workflow";
import { getSupabaseAdminClient } from "../supabase";
import { ManusActor, resolveSupabaseUserId } from "./override-persistence";
import type { Json } from "./supabase.generated";

const governanceRoles = new Set(["school_admin", "literacy_lead", "content_steward"]);
const selectionRoles = new Set(["school_admin", "literacy_lead", "teacher_set", "content_steward"]);
type MembershipRow = { user_id: string; organisation_id: string; role: string };
type OrganisationRow = { id: string; name: string };
type PassageRow = {
  id: string; organisation_id: string; title: string; body: string; version: number; region_tags: string[];
  approval_status: "DRAFT" | "APPROVED" | "RETIRED"; rights_status: "UNREVIEWED" | "CLEARED" | "BLOCKED";
  safety_status: "UNREVIEWED" | "PASSED" | "BLOCKED"; approved_at: string | null;
};

function asIso(value: string | null) { return value ? new Date(value).toISOString() : null; }
function workflowItem(row: PassageRow): PassageWorkflowItem {
  return PassageWorkflowItem.parse({
    id: row.id,
    title: row.title,
    body: row.body,
    version: row.version,
    regionTags: row.region_tags,
    approvalStatus: row.approval_status,
    rightsStatus: row.rights_status,
    safetyStatus: row.safety_status,
    approvedAt: asIso(row.approved_at),
    canApprove: row.approval_status !== "APPROVED" && row.rights_status === "CLEARED" && row.safety_status === "PASSED",
  });
}

async function membershipFor(actor: ManusActor, organisationId: string) {
  const userId = await resolveSupabaseUserId(actor);
  const { data, error } = await getSupabaseAdminClient().from("memberships")
    .select("user_id, organisation_id, role")
    .eq("user_id", userId)
    .eq("organisation_id", organisationId)
    .maybeSingle();
  const membership = data as MembershipRow | null;
  if (error || !membership || !selectionRoles.has(membership.role)) throw new Error("No authorised Reader Leader membership for this organisation");
  return membership;
}

async function passageWithMembership(actor: ManusActor, passageId: string) {
  const { data, error } = await getSupabaseAdminClient().from("passages")
    .select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at")
    .eq("id", passageId)
    .maybeSingle();
  const passage = data as PassageRow | null;
  if (error || !passage) throw new Error("Passage was not found");
  return { passage, membership: await membershipFor(actor, passage.organisation_id) };
}

async function appendReviewEvent(input: { passageId: string; organisationId: string; reviewerId: string; action: "DRAFT_CREATED" | "RIGHTS_CLEARED" | "RIGHTS_BLOCKED" | "SAFETY_PASSED" | "SAFETY_BLOCKED" | "APPROVED" | "RETIRED"; idempotencyKey: string }) {
  const { data, error } = await getSupabaseAdminClient().from("content_review_events").insert({
    passage_id: input.passageId,
    organisation_id: input.organisationId,
    reviewer_id: input.reviewerId,
    action: input.action,
    idempotency_key: input.idempotencyKey,
  }).select("id, passage_id, action, created_at").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Content review idempotency key has already been used" : "Unable to append content review event");
  return ContentReviewEvent.parse({ id: data.id, passageId: data.passage_id, action: data.action, createdAt: new Date(data.created_at).toISOString() });
}

export async function listContentOrganisations(actor: ManusActor): Promise<ContentOrganisationContext[]> {
  const userId = await resolveSupabaseUserId(actor);
  const { data: memberships, error: membershipError } = await getSupabaseAdminClient().from("memberships").select("user_id, organisation_id, role").eq("user_id", userId);
  if (membershipError) throw new Error("Unable to load authorised organisations");
  const roles = (memberships as MembershipRow[] ?? []).filter(item => selectionRoles.has(item.role));
  if (!roles.length) return [];
  const { data: organisations, error: organisationError } = await getSupabaseAdminClient().from("organisations").select("id, name").in("id", roles.map(item => item.organisation_id));
  if (organisationError) throw new Error("Unable to load authorised organisations");
  const names = new Map((organisations as OrganisationRow[] ?? []).map(item => [item.id, item.name]));
  return roles.flatMap(item => names.has(item.organisation_id) ? [ContentOrganisationContext.parse({ id: item.organisation_id, name: names.get(item.organisation_id), role: item.role, canGovernContent: governanceRoles.has(item.role) })] : []);
}

export async function getContentWorkflowOverview(actor: ManusActor, organisationId: string): Promise<ContentWorkflowOverview> {
  const membership = await membershipFor(actor, organisationId);
  const organisations = await listContentOrganisations(actor);
  const organisation = organisations.find(item => item.id === organisationId);
  if (!organisation) throw new Error("Organisation was not found");
  const { data, error } = await getSupabaseAdminClient().from("passages")
    .select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load passages");
  const passages = (data as PassageRow[] ?? []).map(workflowItem);
  const canGovern = governanceRoles.has(membership.role);
  const { data: events, error: eventError } = canGovern
    ? await getSupabaseAdminClient().from("content_review_events").select("id, passage_id, action, created_at").eq("organisation_id", organisationId).order("created_at", { ascending: false }).limit(12)
    : { data: [], error: null };
  if (eventError) throw new Error("Unable to load content review history");
  return ContentWorkflowOverview.parse({
    organisation,
    approvedPassages: passages.filter(item => item.approvalStatus === "APPROVED"),
    reviewQueue: canGovern ? passages.filter(item => item.approvalStatus !== "RETIRED") : [],
    reviewHistory: (events ?? []).map(event => ({ id: event.id, passageId: event.passage_id, action: event.action, createdAt: new Date(event.created_at).toISOString() })),
  });
}

export async function createPassageDraft(actor: ManusActor, input: CreatePassageDraftInput) {
  const membership = await membershipFor(actor, input.organisationId);
  if (!governanceRoles.has(membership.role)) throw new Error("Only content stewards or school leads may create passage drafts");
  const { data, error } = await getSupabaseAdminClient().from("passages").insert({
    organisation_id: input.organisationId,
    title: input.title,
    body: input.body,
    region_tags: input.regionTags,
    phonics_profile: input.phonicsProfile as Json,
    approval_status: "DRAFT",
    rights_status: "UNREVIEWED",
    safety_status: "UNREVIEWED",
    creation_idempotency_key: input.idempotencyKey,
  }).select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at").single();
  if (error || !data) throw new Error(error?.code === "23505" ? "Passage creation idempotency key has already been used" : "Unable to create passage draft");
  await appendReviewEvent({ passageId: data.id, organisationId: input.organisationId, reviewerId: membership.user_id, action: "DRAFT_CREATED", idempotencyKey: input.idempotencyKey });
  return workflowItem(data as PassageRow);
}

export async function setPassageRights(actor: ManusActor, input: SetPassageRightsInput) {
  const { passage, membership } = await passageWithMembership(actor, input.passageId);
  if (!governanceRoles.has(membership.role)) throw new Error("Only content stewards or school leads may review passage rights");
  const update = input.rightsStatus === "BLOCKED" ? { rights_status: input.rightsStatus, approval_status: "DRAFT" as const, approved_at: null, approved_by: null } : { rights_status: input.rightsStatus };
  const { data, error } = await getSupabaseAdminClient().from("passages").update(update).eq("id", passage.id).select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at").single();
  if (error || !data) throw new Error("Unable to update passage rights review");
  await appendReviewEvent({ passageId: passage.id, organisationId: passage.organisation_id, reviewerId: membership.user_id, action: input.rightsStatus === "CLEARED" ? "RIGHTS_CLEARED" : "RIGHTS_BLOCKED", idempotencyKey: input.idempotencyKey });
  return workflowItem(data as PassageRow);
}

export async function setPassageSafety(actor: ManusActor, input: SetPassageSafetyInput) {
  const { passage, membership } = await passageWithMembership(actor, input.passageId);
  if (!governanceRoles.has(membership.role)) throw new Error("Only content stewards or school leads may review passage safety");
  const update = input.safetyStatus === "BLOCKED" ? { safety_status: input.safetyStatus, approval_status: "DRAFT" as const, approved_at: null, approved_by: null } : { safety_status: input.safetyStatus };
  const { data, error } = await getSupabaseAdminClient().from("passages").update(update).eq("id", passage.id).select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at").single();
  if (error || !data) throw new Error("Unable to update passage safety review");
  await appendReviewEvent({ passageId: passage.id, organisationId: passage.organisation_id, reviewerId: membership.user_id, action: input.safetyStatus === "PASSED" ? "SAFETY_PASSED" : "SAFETY_BLOCKED", idempotencyKey: input.idempotencyKey });
  return workflowItem(data as PassageRow);
}

export async function approvePassage(actor: ManusActor, input: ApprovePassageInput) {
  const { passage, membership } = await passageWithMembership(actor, input.passageId);
  if (!governanceRoles.has(membership.role)) throw new Error("Only content stewards or school leads may approve passages");
  if (passage.rights_status !== "CLEARED" || passage.safety_status !== "PASSED") throw new Error("Passage approval requires cleared rights and passed safety review");
  const { data, error } = await getSupabaseAdminClient().from("passages").update({ approval_status: "APPROVED", approved_at: new Date().toISOString(), approved_by: membership.user_id }).eq("id", passage.id).select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at").single();
  if (error || !data) throw new Error("Unable to approve passage");
  await appendReviewEvent({ passageId: passage.id, organisationId: passage.organisation_id, reviewerId: membership.user_id, action: "APPROVED", idempotencyKey: input.idempotencyKey });
  return workflowItem(data as PassageRow);
}

export async function retirePassage(actor: ManusActor, input: RetirePassageInput) {
  const { passage, membership } = await passageWithMembership(actor, input.passageId);
  if (!governanceRoles.has(membership.role)) throw new Error("Only content stewards or school leads may retire passages");
  const { data, error } = await getSupabaseAdminClient().from("passages").update({ approval_status: "RETIRED", approved_at: null, approved_by: null }).eq("id", passage.id).select("id, organisation_id, title, body, version, region_tags, approval_status, rights_status, safety_status, approved_at").single();
  if (error || !data) throw new Error("Unable to retire passage");
  await appendReviewEvent({ passageId: passage.id, organisationId: passage.organisation_id, reviewerId: membership.user_id, action: "RETIRED", idempotencyKey: input.idempotencyKey });
  return workflowItem(data as PassageRow);
}
