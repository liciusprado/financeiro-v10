import React, { createContext, useContext, useState, useEffect } from "react";

/**
 * Contexto para armazenar o usuário selecionado (Lícius ou Marielly).
 *
 * Muitos aplicativos para casais permitem que cada parceiro tenha sua própria
 * credencial, mas este projeto não implementa um sistema de autenticação
 * completo. Em vez disso, fornecemos uma forma simples de o usuário escolher
 * qual perfil utilizar após o login via Manus. A seleção é persistida em
 * localStorage para que a escolha permaneça entre recarregamentos.
 */

// Tipo de usuário selecionado. Pode ser "licius", "marielly" ou null (não definido).
export type SelectedUser = "licius" | "marielly" | null;

// Interface do contexto expondo o usuário atual e a função para alterá‑lo.
interface SelectedUserContextType {
  selectedUser: SelectedUser;
  setSelectedUser: (user: SelectedUser) => void;
}

const SelectedUserContext = createContext<SelectedUserContextType | undefined>(undefined);

/**
 * Provedor do SelectedUserContext. Lê o valor inicial de localStorage e
 * o grava sempre que muda. Ele deve envolver a aplicação para que
 * qualquer componente possa acessar ou alterar o usuário selecionado.
 */
export const SelectedUserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedUser, setSelectedUserState] = useState<SelectedUser>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("selectedUser");
      if (stored === "licius" || stored === "marielly") {
        return stored as SelectedUser;
      }
    }
    return null;
  });

  /**
   * Atualiza o estado do usuário selecionado e persiste a escolha em
   * localStorage. Se o valor for null, remove a chave de localStorage.
   */
  const setSelectedUser = (user: SelectedUser) => {
    setSelectedUserState(user);
    if (typeof window !== "undefined") {
      if (user) {
        window.localStorage.setItem("selectedUser", user);
      } else {
        window.localStorage.removeItem("selectedUser");
      }
    }
  };

  return (
    <SelectedUserContext.Provider value={{ selectedUser, setSelectedUser }}>
      {children}
    </SelectedUserContext.Provider>
  );
};

/**
 * Hook de conveniência para acessar o SelectedUserContext. Gera erro se
 * utilizado fora de um SelectedUserProvider.
 */
export const useSelectedUser = (): SelectedUserContextType => {
  const context = useContext(SelectedUserContext);
  if (!context) {
    throw new Error("useSelectedUser deve ser utilizado dentro de SelectedUserProvider");
  }
  return context;
};