import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, File, X, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AttachmentUploadProps {
  itemId: number;
  month: number;
  year: number;
}

export function AttachmentUpload({ itemId, month, year }: AttachmentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const utils = trpc.useUtils();

  // Buscar entries do mês
  const { data: entries = [] } = trpc.finance.getMonthEntries.useQuery({ month, year });
  const entry = entries.find((e) => e.itemId === itemId);
  const entryId = entry?.id || 0;

  // Criar entry se não existir
  const upsertEntryMutation = trpc.finance.upsertEntry.useMutation({
    onSuccess: () => {
      utils.finance.getMonthEntries.invalidate({ month, year });
    },
  });

  const { data: attachments = [], refetch } = trpc.finance.getAttachments.useQuery(
    { entryId },
    { enabled: entryId > 0 }
  );

  const uploadMutation = trpc.finance.uploadAttachment.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Anexo enviado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar anexo: " + error.message);
    },
  });

  const ensureEntryExists = async () => {
    if (!entry) {
      // Criar entry com valor zero
      await upsertEntryMutation.mutateAsync({
        itemId,
        month,
        year,
        person: "licius",
        plannedValue: 0,
      });
      // Aguardar atualização
      await utils.finance.getMonthEntries.invalidate({ month, year });
      return true;
    }
    return true;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    // Validar tipo
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use JPG, PNG ou PDF.");
      return;
    }

    setUploading(true);

    try {
      // Garantir que entry existe
      await ensureEntryExists();
      
      // Aguardar um pouco para garantir que o entry foi criado
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Buscar entry atualizado
      const updatedEntries = await utils.finance.getMonthEntries.fetch({ month, year });
      const updatedEntry = updatedEntries.find((e) => e.itemId === itemId);
      
      if (!updatedEntry) {
        toast.error("Erro ao criar lançamento");
        setUploading(false);
        return;
      }

      // Converter para base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        
        const fileKey = `attachments/${updatedEntry.id}/${Date.now()}-${file.name}`;
        const fileUrl = base64;
        
        await uploadMutation.mutateAsync({
          entryId: updatedEntry.id,
          fileName: file.name,
          fileUrl,
          fileKey,
          fileSize: file.size,
          mimeType: file.type,
        });
        
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setUploading(false);
      toast.error("Erro ao processar arquivo");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-8 w-8 p-0 relative"
        title="Anexos"
      >
        <Upload className="h-4 w-4" />
        {attachments.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
            {attachments.length}
          </span>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Anexos do Lançamento</DialogTitle>
            <DialogDescription>
              Adicione recibos, comprovantes ou notas fiscais (JPG, PNG, PDF - máx. 5MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload Button */}
            <div className="flex justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
              <label className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Enviando..." : "Clique para selecionar arquivo"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Attachments List */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Arquivos anexados:</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {attachment.mimeType.startsWith("image/") ? (
                          <ImageIcon className="h-5 w-5 text-primary flex-shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)} •{" "}
                            {new Date(attachment.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(attachment.fileUrl, "_blank")}
                          title="Visualizar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
