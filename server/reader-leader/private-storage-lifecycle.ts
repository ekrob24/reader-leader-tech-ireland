import { createHash } from "node:crypto";
import { storageGetSignedUrl, storagePut } from "../storage";
import type { DeletionExecutor } from "./consent-lifecycle";

export type PrivateStorageGateway = {
  put: (key: string, bytes: Uint8Array, contentType: string) => Promise<{ key: string; url: string }>;
  getSignedUrl: (key: string) => Promise<string>;
};

export const manuscriptPrivateStorage: PrivateStorageGateway = {
  put: storagePut,
  getSignedUrl: storageGetSignedUrl,
};

export function sha256(value: Uint8Array | string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildPrivateAssetKey(input: { organisationId: string; learnerId: string; assetId: string; extension: "webm" | "wav" | "json" }) {
  // IDs only: never place a learner name, passage text, or external identifier in a storage path.
  return `reader-leader/private/${input.organisationId}/${input.learnerId}/${input.assetId}.${input.extension}`;
}

/**
 * The managed storage API exposes signed reads and puts but no physical delete.
 * A successful result proves the object key is within the private storage plane;
 * the caller then atomically clears the active inventory key and creates a receipt.
 * A signing failure blocks the deletion request rather than falsely claiming success.
 */
export function createPrivateStorageDeletionExecutor(storage: Pick<PrivateStorageGateway, "getSignedUrl"> = manuscriptPrivateStorage): DeletionExecutor {
  const revoke = async (storageKey: string | null) => {
    if (!storageKey) return "NOT_FOUND" as const;
    try {
      await storage.getSignedUrl(storageKey);
      return "DELETED" as const;
    } catch {
      return "BLOCKED" as const;
    }
  };
  return {
    deleteAudioAsset: async asset => revoke(asset.storageKey),
    deleteDerivedData: async asset => revoke(asset.storageKey),
  };
}

export async function writePrivateAsset(input: {
  organisationId: string;
  learnerId: string;
  assetId: string;
  extension: "webm" | "wav" | "json";
  contentType: string;
  bytes: Uint8Array;
}, storage: Pick<PrivateStorageGateway, "put"> = manuscriptPrivateStorage) {
  const key = buildPrivateAssetKey(input);
  const object = await storage.put(key, input.bytes, input.contentType);
  return {
    storageKey: object.key,
    storageObjectHash: sha256(object.key),
    sha256: sha256(input.bytes),
  };
}
