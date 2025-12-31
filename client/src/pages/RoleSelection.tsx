import { Button } from "@/components/ui/button";
import { useSelectedUser } from "@/contexts/SelectedUserContext";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// This page is extended to support two-factor authentication (2FA).
// When 2FA is enabled via the settings page, selecting a user triggers
// a verification flow: a one-time code is sent to the selected person
// via e‑mail/WhatsApp, the user must enter the code, and only then
// does the application set the selectedUser and navigate to the dashboard.

/**
 * Página simples para que o usuário selecione qual perfil utilizar.
 *
 * Após o login via Manus, apresentamos esta tela ao usuário para
 * escolher entre "Lícius" ou "Marielly". Essa escolha define o
 * contexto de acesso (entradas e metas) e é persistida via
 * SelectedUserContext. Uma vez selecionado, o usuário é redirecionado
 * para a página inicial do dashboard.
 */
export default function RoleSelection() {
  const { setSelectedUser } = useSelectedUser();
  const [, setLocation] = useLocation();

  // Fetch current user settings to determine if 2FA is enabled
  const { data: settings } = trpc.finance.getSettings.useQuery();
  // Mutation to verify a TOTP (Google Authenticator) code. SMS-based 2FA is no longer used.
  const verifyTwoFactorAppCode = trpc.finance.verifyTwoFactorAppCode.useMutation();

  const handleSelect = async (user: "licius" | "marielly") => {
    // Se a autenticação em duas etapas estiver habilitada via aplicativo
    if (settings?.twoFactorEnabled) {
      const code = window.prompt(
        "Autenticação em duas etapas habilitada. Abra seu aplicativo de autenticação (Google Authenticator, Authy, etc.) e insira o código de 6 dígitos:"
      );
      if (!code) {
        toast.error("Login cancelado. Nenhum código inserido.");
        return;
      }
      try {
        await verifyTwoFactorAppCode.mutateAsync({ code });
      } catch (error: any) {
        toast.error(error?.message || "Falha na verificação de duas etapas.");
        return;
      }
    }
    // Se 2FA não estiver habilitado ou verificado com sucesso, prosseguir
    setSelectedUser(user);
    setLocation("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Selecione seu usuário</h1>
        <p className="text-muted-foreground mb-6">Escolha como deseja acessar suas finanças</p>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <Button
          className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white text-lg"
          onClick={() => handleSelect("licius")}
        >
          Entrar como Lícius
        </Button>
        <Button
          className="px-8 py-4 bg-pink-500 hover:bg-pink-600 text-white text-lg"
          onClick={() => handleSelect("marielly")}
        >
          Entrar como Marielly
        </Button>
      </div>
    </div>
  );
}