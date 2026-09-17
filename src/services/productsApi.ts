import { api } from "@/services/apiClient";
import type { Product } from "@/types";

// ─── Marketplace ────────────────────────────────────────────────────────────

// Fase 1: products migrou para o backend próprio (catálogo somente leitura,
// cadastrado fora do app — sem endpoint de escrita, mesma regra de antes).
export const getProducts = async (): Promise<Product[]> => {
  try {
    return await api.get<Product[]>("/products");
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
};
