import type { AppRole, Membership } from "@shared/contracts/reader-leader";

export type AccessContext = Readonly<{
  userId: string;
  memberships: readonly Membership[];
}>;

export type ConsentBoundary = Readonly<{
  guardianId: string;
  learnerOrganisationId: string;
}>;

export type RlsResource =
  | "evidence_bundles"
  | "agent_decisions"
  | "human_reviews"
  | "audit_events";

function hasMembership(
  context: AccessContext,
  organisationId: string,
  roles?: readonly AppRole[],
): boolean {
  return context.memberships.some(
    membership =>
      membership.userId === context.userId &&
      membership.organisationId === organisationId &&
      (!roles || roles.includes(membership.role)),
  );
}

export function canReadOrganisation(
  context: AccessContext,
  organisationId: string,
): boolean {
  return hasMembership(context, organisationId);
}

export function canReadMembership(
  context: AccessContext,
  membership: Membership,
): boolean {
  return membership.userId === context.userId || canReadOrganisation(context, membership.organisationId);
}

export function canReadConsent(
  context: AccessContext,
  consent: ConsentBoundary,
): boolean {
  return (
    consent.guardianId === context.userId ||
    canReadOrganisation(context, consent.learnerOrganisationId)
  );
}

export function canReadOrgScopedResource(
  context: AccessContext,
  organisationId: string,
): boolean {
  return canReadOrganisation(context, organisationId);
}

export function canInsertHumanReview(
  context: AccessContext,
  reviewerId: string,
): boolean {
  return reviewerId === context.userId;
}

export function canReadAudit(
  context: AccessContext,
  actorId: string | null,
): boolean {
  return actorId === context.userId;
}

export function canClientMutate(
  resource: RlsResource,
  operation: "insert" | "update" | "delete",
): boolean {
  if (resource === "human_reviews" && operation === "insert") return true;
  return false;
}
