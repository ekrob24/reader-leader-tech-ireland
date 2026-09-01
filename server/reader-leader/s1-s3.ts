import {
  EvidenceBundle,
  FixtureEvidenceCase,
} from "@shared/contracts/reader-leader";
import {
  ImmutableFixtureEvidencePack,
  loadGoldPack,
} from "../fixtures/evidence-loader";

export async function loadFixtureEvidencePack(): Promise<ImmutableFixtureEvidencePack> {
  return loadGoldPack();
}

export function selectEvidenceCase(
  pack: ImmutableFixtureEvidencePack,
  caseId: string,
): FixtureEvidenceCase {
  const selected = pack.cases.find(item => item.id === caseId);
  if (!selected) {
    throw new Error(`Unknown fixture evidence case: ${caseId}`);
  }
  EvidenceBundle.parse(selected);
  return selected;
}

export function selectEvidenceForSession(
  pack: ImmutableFixtureEvidencePack,
  sessionId: string,
): FixtureEvidenceCase {
  const matches = pack.cases.filter(item => item.sessionId === sessionId);
  if (matches.length !== 1) {
    throw new Error(
      matches.length === 0
        ? `No fixture evidence for session: ${sessionId}`
        : `Multiple fixture evidence cases for session: ${sessionId}`,
    );
  }
  return matches[0];
}
