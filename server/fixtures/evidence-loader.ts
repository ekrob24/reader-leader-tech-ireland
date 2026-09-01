import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  FixtureEvidenceCase,
  FixtureEvidencePack,
  LoadFixtureInput,
} from "@shared/contracts/reader-leader";

const CASES_PATH = fileURLToPath(new URL("./gold-pack/cases.json", import.meta.url));

function parseCases(raw: unknown): readonly FixtureEvidenceCase[] {
  if (!Array.isArray(raw)) {
    throw new Error("Fixture evidence must be a JSON array");
  }

  const parsed = raw.map((item, index) => {
    const result = FixtureEvidenceCase.safeParse(item);
    if (!result.success) {
      throw new Error(`Invalid gold-pack case at index ${index}: ${result.error.message}`);
    }
    return result.data;
  });

  const ids = new Set<string>();
  for (const item of parsed) {
    if (ids.has(item.id)) {
      throw new Error(`Duplicate gold-pack case id: ${item.id}`);
    }
    ids.add(item.id);
  }

  return Object.freeze(parsed.map(item => Object.freeze(item)));
}

export type ImmutableFixtureEvidencePack = Readonly<{
  version: FixtureEvidencePack["version"];
  cases: readonly FixtureEvidenceCase[];
}>;

export async function loadGoldPack(
  input: unknown = {},
): Promise<ImmutableFixtureEvidencePack> {
  const { packVersion } = LoadFixtureInput.parse(input);
  if (packVersion !== "gold-pack-1") {
    throw new Error(`Unsupported fixture pack: ${packVersion}`);
  }

  const source = await readFile(CASES_PATH, "utf8");
  const raw: unknown = JSON.parse(source);
  const cases = parseCases(raw);
  return Object.freeze({ version: packVersion, cases });
}

export function loadGoldPackFromValue(
  value: unknown,
  input: unknown = {},
): ImmutableFixtureEvidencePack {
  const { packVersion } = LoadFixtureInput.parse(input);
  return Object.freeze({ version: packVersion, cases: parseCases(value) });
}
