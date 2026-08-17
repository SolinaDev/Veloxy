import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUserProfile } from "@/services/database";

// Regressão do bug crítico da auditoria: o cadastro por e-mail/senha não
// criava o doc users/{uid}, então o primeiro updateUserXP virava um
// "create" com totalXP > 0 e era rejeitado pela regra validUserCreate
// (que só aceita totalXP ausente ou 0 num doc novo). createUserProfile foi
// escrita para nunca tocar totalXP/level — este teste garante que isso não
// regride silenciosamente.

const { setDocMock, docMock } = vi.hoisted(() => ({
  setDocMock: vi.fn().mockResolvedValue(undefined),
  docMock: vi.fn((..._args: unknown[]) => ({ __ref: true })),
}));

vi.mock("@/config/firebase", () => ({
  db: {},
  auth: {},
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  where: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  Timestamp: { fromDate: vi.fn(), fromMillis: vi.fn() },
  onSnapshot: vi.fn(),
  doc: docMock,
  updateDoc: vi.fn(),
  arrayUnion: vi.fn((...items: unknown[]) => ({ __op: "arrayUnion", items })),
  arrayRemove: vi.fn((...items: unknown[]) => ({ __op: "arrayRemove", items })),
  limit: vi.fn(),
  startAfter: vi.fn(),
  setDoc: setDocMock,
  getDoc: vi.fn(),
  increment: vi.fn((n: number) => ({ __op: "increment", n })),
  writeBatch: vi.fn(),
  deleteDoc: vi.fn(),
  documentId: vi.fn(),
  runTransaction: vi.fn(),
}));

describe("createUserProfile", () => {
  beforeEach(() => {
    setDocMock.mockClear();
  });

  it("nunca inclui totalXP ou level no documento criado", async () => {
    await createUserProfile("user-123", { displayName: "Ana", photoURL: null });

    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];

    expect(payload).not.toHaveProperty("totalXP");
    expect(payload).not.toHaveProperty("level");
  });

  it("só grava só os campos permitidos pela whitelist de criação do usuário", async () => {
    await createUserProfile("user-123", { displayName: "Ana", photoURL: "https://x/y.png" });

    const [, payload] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    const allowedKeys = [
      "displayName",
      "photoURL",
      "termsAcceptedAt",
      "termsVersion",
      "createdAt",
      "lastUpdated",
    ];
    for (const key of Object.keys(payload)) {
      expect(allowedKeys).toContain(key);
    }
  });

  it("grava termsVersion/termsAcceptedAt apenas quando o cadastro informa a versão dos termos", async () => {
    await createUserProfile("user-456", {
      displayName: "Bruno",
      photoURL: null,
      termsVersion: "2026-08-07",
    });
    const [, withTerms] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(withTerms.termsVersion).toBe("2026-08-07");
    expect(withTerms).toHaveProperty("termsAcceptedAt");

    setDocMock.mockClear();
    await createUserProfile("user-789", { displayName: "Carla", photoURL: null });
    const [, withoutTerms] = setDocMock.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(withoutTerms).not.toHaveProperty("termsVersion");
    expect(withoutTerms).not.toHaveProperty("termsAcceptedAt");
  });
});
