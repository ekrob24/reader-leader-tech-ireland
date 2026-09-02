import { describe, expect, it, vi } from "vitest";
import { buildPrivateAssetKey, createPrivateStorageDeletionExecutor, sha256, writePrivateAsset } from "./reader-leader/private-storage-lifecycle";

const ids = { organisationId: "11111111-1111-4111-8111-111111111111", learnerId: "22222222-2222-4222-8222-222222222222", assetId: "33333333-3333-4333-8333-333333333333" };

describe("private storage lifecycle", () => {
  it("uses opaque, pseudonymous keys and persists only hashes from the storage response", async () => {
    const put = vi.fn(async (key: string) => ({ key: `${key}-stored`, url: `/manus-storage/${key}-stored` }));
    const bytes = new Uint8Array([1, 2, 3]);
    const written = await writePrivateAsset({ ...ids, extension: "webm", contentType: "audio/webm", bytes }, { put });
    expect(buildPrivateAssetKey({ ...ids, extension: "webm" })).toBe(`reader-leader/private/${ids.organisationId}/${ids.learnerId}/${ids.assetId}.webm`);
    expect(put).toHaveBeenCalledWith(expect.stringContaining(ids.learnerId), bytes, "audio/webm");
    expect(written).toEqual({ storageKey: expect.stringContaining("-stored"), storageObjectHash: sha256(written.storageKey), sha256: sha256(bytes) });
  });

  it("fails closed when the private object cannot be verified for key revocation", async () => {
    const executor = createPrivateStorageDeletionExecutor({ getSignedUrl: vi.fn(async () => { throw new Error("storage unavailable"); }) });
    await expect(executor.deleteAudioAsset({ id: ids.assetId, storageKey: "reader-leader/private/object.webm", storageObjectHash: "a".repeat(64) })).resolves.toBe("BLOCKED");
    await expect(executor.deleteDerivedData({ id: ids.assetId, storageKey: null, storageObjectHash: null })).resolves.toBe("NOT_FOUND");
  });
});
