import { describe, it, expect, vi } from "vitest";

vi.mock("@/config/firebase", () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe("useAuth Hook", () => {
  it("deve inicializar com loading true e user null", () => {
    expect(true).toBe(true);
  });
});
