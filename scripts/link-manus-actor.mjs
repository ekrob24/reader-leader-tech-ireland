import { createAdminClient } from "@supabase/server/core";

const fallbackUrl = "https://qpvzzrgofxregccverfr.supabase.co";
const rawUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const url = /^https?:\/\//i.test(rawUrl) ? new URL(rawUrl).origin : fallbackUrl;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!secretKey || secretKey.length < 20) throw new Error("Supabase server secret is unavailable");

const admin = createAdminClient({ env: { url, secretKeys: { default: secretKey } } });
const manusOpenId = "FoowNxcdgsFcb22xgnckdj";
const email = "estellaroberts91@gmail.com";
const suppliedUid = process.argv[2];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!suppliedUid || !uuidPattern.test(suppliedUid)) throw new Error("A valid Supabase Auth UID is required");
const { data: users, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw new Error(`Unable to inspect Supabase Auth users: ${usersError.message}`);
const match = users.users.find(user => user.id === suppliedUid);
if (!match) throw new Error("The supplied Supabase Auth UID does not exist in this project");
if (match.email && match.email.toLowerCase() !== email.toLowerCase()) throw new Error("The supplied Supabase Auth UID does not match the authenticated actor email");
const { error: linkError } = await admin.from("reader_leader_actor_links").upsert({ manus_open_id: manusOpenId, supabase_user_id: suppliedUid }, { onConflict: "manus_open_id" });
if (linkError) throw new Error(`Unable to persist actor link: ${linkError.message}`);
const { data: memberships, error: membershipError } = await admin.from("memberships").select("organisation_id, role").eq("user_id", suppliedUid);
if (membershipError) throw new Error(`Unable to verify Reader Leader membership: ${membershipError.message}`);
if (!memberships?.length) throw new Error("Actor link exists but the Supabase user has no Reader Leader membership");
const organisationIds = memberships.map(row => row.organisation_id);
const { count: learnerCount, error: learnerError } = await admin.from("learners").select("id", { count: "exact", head: true }).in("organisation_id", organisationIds);
if (learnerError) throw new Error(`Unable to verify learner access: ${learnerError.message}`);
console.log(`Actor link verified; memberships=${memberships.length}; learners=${learnerCount ?? 0}.`);
