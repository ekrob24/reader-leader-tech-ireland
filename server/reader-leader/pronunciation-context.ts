import {
  PronunciationClassification,
  PronunciationClassificationInput,
} from "@shared/contracts/reader-leader";

export function classifyPronunciationContext(
  rawInput: unknown,
): PronunciationClassification {
  const input = PronunciationClassificationInput.parse(rawInput);
  const observed =
    input.observedForm === null
      ? null
      : input.observedForm.toLocaleLowerCase("en-IE");
  const reference = input.referenceWord.toLocaleLowerCase("en-IE");

  if (observed === null) {
    return {
      context: "UNCERTAIN",
      matched: false,
      confidence: 0,
      evidenceRefs: ["pronunciation:no-observation"],
      reasonCode: "NO_OBSERVED_FORM",
    };
  }

  if (observed === reference) {
    return {
      context: "NOT_MATCHED",
      matched: false,
      confidence: 1,
      evidenceRefs: ["pronunciation:exact-match"],
      reasonCode: "EXACT_REFERENCE_MATCH",
    };
  }

  const match = input.lexicon.find(
    entry =>
      entry.referenceWord.toLocaleLowerCase("en-IE") === reference &&
      entry.regionalForm.toLocaleLowerCase("en-IE") === observed &&
      entry.region.toLocaleLowerCase("en-IE") === input.region.toLocaleLowerCase("en-IE"),
  );

  if (match) {
    return PronunciationClassification.parse({
      context: "VALID_REGIONAL_VARIANT",
      matched: true,
      confidence: 1,
      evidenceRefs: [match.evidenceRef],
      reasonCode: "VALID_REGIONAL_VARIANT",
    });
  }

  const sameWordDifferentRegion = input.lexicon.some(
    entry =>
      entry.referenceWord.toLocaleLowerCase("en-IE") === reference &&
      entry.regionalForm.toLocaleLowerCase("en-IE") === observed,
  );

  return PronunciationClassification.parse({
    context: sameWordDifferentRegion ? "UNCERTAIN" : "NOT_MATCHED",
    matched: false,
    confidence: sameWordDifferentRegion ? 0.5 : 0.9,
    evidenceRefs: [sameWordDifferentRegion ? "pronunciation:region-uncertain" : "pronunciation:not-matched"],
    reasonCode: sameWordDifferentRegion ? "REGION_NOT_CONFIRMED" : "LEXICON_MISMATCH",
  });
}
