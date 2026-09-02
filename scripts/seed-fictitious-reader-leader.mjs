import { createAdminClient } from "@supabase/server/core";

const fallbackUrl = "https://qpvzzrgofxregccverfr.supabase.co";
const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const url = /^https?:\/\//i.test(rawUrl) ? new URL(rawUrl).origin : fallbackUrl;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!secretKey || secretKey.length < 20) throw new Error("Supabase server secret is unavailable");
const admin = createAdminClient({ env: { url, secretKeys: { default: secretKey } } });

const supabaseUserId = "52ced790-e8c5-4774-a151-31f11688443f";
const organisationName = "Reader Leader Demo Academy (Fictional)";
const learnerName = "Demo Learner A";

const { data: organisation, error: organisationLookupError } = await admin
  .from("organisations")
  .select("id")
  .eq("name", organisationName)
  .maybeSingle();
if (organisationLookupError) throw new Error(`Unable to inspect demo organisation: ${organisationLookupError.message}`);
let organisationId = organisation?.id;
if (!organisationId) {
  const { data: created, error } = await admin
    .from("organisations")
    .insert({ name: organisationName, region: "IE" })
    .select("id")
    .single();
  if (error || !created) throw new Error(`Unable to create demo organisation: ${error?.message ?? "unknown error"}`);
  organisationId = created.id;
}

const { error: membershipError } = await admin.from("memberships").upsert(
  { user_id: supabaseUserId, organisation_id: organisationId, role: "school_admin" },
  { onConflict: "user_id,organisation_id" },
);
if (membershipError) throw new Error(`Unable to create demo membership: ${membershipError.message}`);

const { data: learner, error: learnerLookupError } = await admin
  .from("learners")
  .select("id")
  .eq("organisation_id", organisationId)
  .eq("display_name", learnerName)
  .maybeSingle();
if (learnerLookupError) throw new Error(`Unable to inspect demo learner: ${learnerLookupError.message}`);
let learnerId = learner?.id;
if (!learnerId) {
  const { data: created, error } = await admin
    .from("learners")
    .insert({ organisation_id: organisationId, display_name: learnerName, pronunciation_set_id: "ie-en-demo-v1", safe_label: learnerName })
    .select("id")
    .single();
  if (error || !created) throw new Error(`Unable to create demo learner: ${error?.message ?? "unknown error"}`);
  learnerId = created.id;
}

const decisionId = "6d42f9f3-4e06-4a6d-a7de-2bc14c1f9d31";
const { error: decisionError } = await admin.from("learner_safety_decisions").upsert({
  id: decisionId,
  learner_id: learnerId,
  organisation_id: organisationId,
  action: "PROMPT",
  status: "OVERRIDDEN",
  summary: "Fictional demo decision for teacher review.",
  override_id: null,
}, { onConflict: "id" });
if (decisionError) throw new Error(`Unable to create demo timeline entry: ${decisionError.message}`);

const { error: eventError } = await admin.from("learner_safety_events").upsert({
  id: "af8c5a7f-37f7-4d8d-9a04-777ab9b94015",
  learner_id: learnerId,
  organisation_id: organisationId,
  actor_id: supabaseUserId,
  event_type: "OVERRIDE_CREATED",
  summary: "Fictional demo override created for teacher review.",
  idempotency_key: "fictional-demo-override-created-v1",
}, { onConflict: "id" });
if (eventError) throw new Error(`Unable to create demo audit event: ${eventError.message}`);

console.log("Fictitious Reader Leader organisation, membership, learner, timeline, and audit fixture are ready.");
