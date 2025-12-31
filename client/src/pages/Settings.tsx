import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings as SettingsIcon, Save, Download, ShieldCheck } from "lucide-react";
import { useSelectedUser } from "@/contexts/SelectedUserContext";

export default function Settings() {
  const { data: settings, isLoading } = trpc.finance.getSettings.useQuery();
  const updateSettings = trpc.finance.updateSettings.useMutation();
  const createBackup = trpc.finance.createBackup.useMutation();

  // 2FA via app (TOTP) mutations
  const setupTwoFactorApp = trpc.finance.setupTwoFactorApp.useMutation();
  const verifyTwoFactorAppCode = trpc.finance.verifyTwoFactorAppCode.useMutation();
  const disableTwoFactorApp = trpc.finance.disableTwoFactorApp.useMutation();

  const [colorTabs, setColorTabs] = useState("#3b82f6");
  const [colorButtons, setColorButtons] = useState("#3b82f6");
  const [colorText, setColorText] = useState("#ffffff");
  const [colorBackground, setColorBackground] = useState("#0f172a");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Inter");
  const [chartType, setChartType] = useState<"pie" | "bar" | "doughnut">("pie");
  const [chartShowLabels, setChartShowLabels] = useState(true);
  const [chartShowValues, setChartShowValues] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");

  // Budget method selection. Defaults to "categories".
  const [budgetMethod, setBudgetMethod] = useState<"categories" | "groups" | "50-30-20" | "envelopes">("categories");

  // Two-factor authentication state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  // Biometric authentication (WebAuthn) state
  const [webAuthnEnabled, setWebAuthnEnabled] = useState(false);

  // TRPC hooks for WebAuthn endpoints
  const beginWebAuthnRegistration = trpc.auth.beginWebAuthnRegistration.useMutation();
  const completeWebAuthnRegistration = trpc.auth.completeWebAuthnRegistration.useMutation();
  const disableWebAuthn = trpc.auth.disableWebAuthn.useMutation();
  // Access selected user (not used for TOTP but kept for consistency with other settings)
  const { selectedUser } = useSelectedUser();

  useEffect(() => {
    if (settings) {
      setColorTabs(settings.colorTabs || "#3b82f6");
      setColorButtons(settings.colorButtons || "#3b82f6");
      setColorText(settings.colorText || "#ffffff");
      setColorBackground(settings.colorBackground || "#0f172a");
      setFontSize(settings.fontSize || 16);
      setFontFamily(settings.fontFamily || "Inter");
      setChartType(settings.chartType || "pie");
      setChartShowLabels(settings.chartShowLabels ?? true);
      setChartShowValues(settings.chartShowValues ?? true);
      setAutoBackupEnabled(settings.autoBackupEnabled ?? false);
      setAutoBackupFrequency(settings.autoBackupFrequency || "weekly");

      // Load budgeting method and 2FA status from settings
      setBudgetMethod((settings as any).budgetMethod || "categories");
      setTwoFactorEnabled((settings as any).twoFactorEnabled ?? false);
      setWebAuthnEnabled((settings as any).webAuthnEnabled ?? false);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        colorTabs,
        colorButtons,
        colorText,
        colorBackground,
        fontSize,
        fontFamily,
        chartType,
        chartShowLabels,
        chartShowValues,
        autoBackupEnabled,
        autoBackupFrequency,
        budgetMethod,
        twoFactorEnabled,
        webAuthnEnabled,
      });
      toast.success("Configurações salvas com sucesso!");
      // Recarregar página para aplicar mudanças
      window.location.reload();
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleBackup = async () => {
    try {
      const result = await createBackup.mutateAsync();
      toast.success(`Backup criado com sucesso! ${result.entriesCount} lançamentos salvos.`);
      
      // Fazer download do arquivo
      const link = document.createElement("a");
      link.href = result.fileUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast.error("Erro ao criar backup");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando configurações...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Personalize a aparência e funcionalidades do sistema</p>
        </div>
      </div>

      {/* Cores */}
      <Card>
        <CardHeader>
          <CardTitle>🎨 Personalização de Cores</CardTitle>
          <CardDescription>Customize as cores da interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="colorTabs">Cor das Abas</Label>
              <div className="flex gap-2">
                <Input
                  id="colorTabs"
                  type="color"
                  value={colorTabs}
                  onChange={(e) => setColorTabs(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorTabs}
                  onChange={(e) => setColorTabs(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorButtons">Cor dos Botões</Label>
              <div className="flex gap-2">
                <Input
                  id="colorButtons"
                  type="color"
                  value={colorButtons}
                  onChange={(e) => setColorButtons(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorButtons}
                  onChange={(e) => setColorButtons(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorText">Cor do Texto</Label>
              <div className="flex gap-2">
                <Input
                  id="colorText"
                  type="color"
                  value={colorText}
                  onChange={(e) => setColorText(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorText}
                  onChange={(e) => setColorText(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="colorBackground">Cor do Fundo</Label>
              <div className="flex gap-2">
                <Input
                  id="colorBackground"
                  type="color"
                  value={colorBackground}
                  onChange={(e) => setColorBackground(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={colorBackground}
                  onChange={(e) => setColorBackground(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Método de Orçamento */}
      <Card>
        <CardHeader>
          <CardTitle>💡 Método de Orçamento</CardTitle>
          <CardDescription>
            Escolha como deseja organizar seu orçamento: por categorias, grupos (fixos/variáveis/não mensais), regra 50/30/20 ou envelopes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budgetMethod">Método selecionado</Label>
            <Select value={budgetMethod} onValueChange={(v) => setBudgetMethod(v as any)}>
              <SelectTrigger id="budgetMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="categories">Orçamento por Categorias</SelectItem>
                <SelectItem value="groups">Grupos: Fixos / Variáveis / Não Mensais</SelectItem>
                <SelectItem value="50-30-20">Regra 50/30/20</SelectItem>
                <SelectItem value="envelopes">Envelopes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Segurança: Autenticação em Duas Etapas */}
      <Card>
        <CardHeader>
          <CardTitle>🔐 Segurança</CardTitle>
          <CardDescription>Ative a autenticação em duas etapas (2FA) para proteger ainda mais o acesso.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="twoFactorSwitch">Autenticação de Duas Etapas</Label>
              <p className="text-sm text-muted-foreground">Use um aplicativo autenticador (como Google Authenticator) para gerar códigos de acesso.</p>
            </div>
            <Switch
              id="twoFactorSwitch"
              checked={twoFactorEnabled}
              onCheckedChange={async (checked) => {
                if (checked) {
                  // Habilitar 2FA via app: gerar segredo, instruir usuário e verificar código
                  try {
                    const result = await setupTwoFactorApp.mutateAsync();
                    const secret = (result as any).secret as string;
                    // Mostrar segredo ao usuário para configurar no aplicativo autenticador
                    window.alert(
                      'Copie este segredo para o seu aplicativo de autenticação (Google Authenticator, Authy, etc.) e crie uma nova conta:\n\n' +
                      secret +
                      '\n\nEm seguida, insira o código gerado pelo aplicativo para confirmar a ativação.'
                    );
                    const code = window.prompt('Insira o código do seu aplicativo de autenticação');
                    if (!code) {
                      toast.error('Ativação cancelada. Nenhum código inserido.');
                      // Desativar novamente o 2FA recém habilitado
                      await disableTwoFactorApp.mutateAsync();
                      setTwoFactorEnabled(false);
                      return;
                    }
                    await verifyTwoFactorAppCode.mutateAsync({ code });
                    toast.success('Autenticação via aplicativo ativada com sucesso!');
                    setTwoFactorEnabled(true);
                  } catch (error: any) {
                    toast.error('Erro na configuração do autenticador: ' + (error?.message || ''));
                    // Desfaz qualquer ativação parcial
                    try {
                      await disableTwoFactorApp.mutateAsync();
                    } catch (_) {}
                    setTwoFactorEnabled(false);
                  }
                } else {
                  // Desativar 2FA via app
                  try {
                    await disableTwoFactorApp.mutateAsync();
                    toast.success('Autenticação em duas etapas desativada');
                  } catch (error: any) {
                    toast.error('Erro ao desativar 2FA: ' + (error?.message || ''));
                  }
                  setTwoFactorEnabled(false);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Segurança: Login Biométrico */}
      <Card>
        <CardHeader>
          <CardTitle>🖐️ Login Biométrico</CardTitle>
          <CardDescription>Use Touch ID, Face ID ou leitor de digitais para uma autenticação rápida e segura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="webAuthnSwitch">Login Biométrico</Label>
              <p className="text-sm text-muted-foreground">Habilite para usar os recursos biométricos do seu dispositivo via WebAuthn.</p>
            </div>
            <Switch
              id="webAuthnSwitch"
              checked={webAuthnEnabled}
              onCheckedChange={async (checked) => {
                if (checked) {
                  try {
                    // Start registration via TRPC to get challenge and options
                    const res: any = await beginWebAuthnRegistration.mutateAsync({});
                    const options = res;
                    // Convert base64url strings to ArrayBuffers
                    const decode = (str: string) => Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
                    const publicKey: any = {
                      challenge: decode(options.challenge),
                      rp: options.rp,
                      user: {
                        id: decode(options.user.id),
                        name: options.user.name,
                        displayName: options.user.displayName,
                      },
                      pubKeyCredParams: options.pubKeyCredParams,
                      authenticatorSelection: options.authenticatorSelection,
                      timeout: options.timeout,
                    };
                    // Prompt the user to register a new credential
                    const credential: any = await (navigator as any).credentials.create({ publicKey });
                    if (!credential) throw new Error('Credential creation aborted');
                    // Encode credential ID and public key
                    const rawId = credential.rawId as ArrayBuffer;
                    const idb64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(rawId)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    // The browser does not expose the public key directly; many libraries wrap this logic.
                    // Here we store an empty string as placeholder. In production, derive the public key from
                    // the attestation object using a WebAuthn library.
                    const pk = '';
                    await completeWebAuthnRegistration.mutateAsync({ credentialId: idb64, publicKey: pk, signCount: 0, label: undefined });
                    setWebAuthnEnabled(true);
                    toast.success('Login biométrico habilitado.');
                  } catch (err: any) {
                    console.error(err);
                    toast.error('Falha ao configurar login biométrico.');
                    setWebAuthnEnabled(false);
                  }
                } else {
                  try {
                    await disableWebAuthn.mutateAsync();
                    setWebAuthnEnabled(false);
                    toast.success('Login biométrico desativado');
                  } catch (err: any) {
                    toast.error('Erro ao desativar login biométrico');
                    setWebAuthnEnabled(true);
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tipografia */}
      <Card>
        <CardHeader>
          <CardTitle>✍️ Tipografia</CardTitle>
          <CardDescription>Ajuste o tamanho e a família da fonte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fontSize">Tamanho da Fonte (px)</Label>
              <Input
                id="fontSize"
                type="number"
                min="12"
                max="24"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontFamily">Família da Fonte</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger id="fontFamily">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Configurações de Gráficos</CardTitle>
          <CardDescription>Personalize a exibição dos gráficos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chartType">Tipo de Gráfico</Label>
            <Select value={chartType} onValueChange={(v) => setChartType(v as any)}>
              <SelectTrigger id="chartType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pie">Pizza</SelectItem>
                <SelectItem value="doughnut">Rosca</SelectItem>
                <SelectItem value="bar">Barras</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="chartShowLabels">Mostrar Rótulos</Label>
            <Switch
              id="chartShowLabels"
              checked={chartShowLabels}
              onCheckedChange={setChartShowLabels}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="chartShowValues">Mostrar Valores</Label>
            <Switch
              id="chartShowValues"
              checked={chartShowValues}
              onCheckedChange={setChartShowValues}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle>💾 Backup</CardTitle>
          <CardDescription>Configure backups automáticos e crie backups manuais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="autoBackup">Backup Automático</Label>
              <p className="text-sm text-muted-foreground">Criar backups automaticamente</p>
            </div>
            <Switch
              id="autoBackup"
              checked={autoBackupEnabled}
              onCheckedChange={setAutoBackupEnabled}
            />
          </div>

          {autoBackupEnabled && (
            <div className="space-y-2">
              <Label htmlFor="backupFrequency">Frequência</Label>
              <Select value={autoBackupFrequency} onValueChange={(v) => setAutoBackupFrequency(v as any)}>
                <SelectTrigger id="backupFrequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              onClick={handleBackup}
              disabled={createBackup.isPending}
              className="w-full"
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {createBackup.isPending ? "Criando backup..." : "Criar Backup Manual"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          size="lg"
          className="min-w-[200px]"
        >
          <Save className="mr-2 h-4 w-4" />
          {updateSettings.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
