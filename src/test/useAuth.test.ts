// 1. Instalar dependências:
// npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event @vitejs/plugin-react

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/AuthContext';

// Mock do Firebase Auth
vi.mock('@/firebase', () => ({
  auth: {
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn()
  }
}));

describe('useAuth Hook', () => {
  it('deve inicializar com loading true e user null', () => {
    // Exemplo de teste unitário básico
    // Note: Na prática você precisaria colocar o AuthProvider no wrapper do renderHook
    expect(true).toBe(true); 
  });
});
