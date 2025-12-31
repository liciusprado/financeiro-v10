import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles, Download } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function AIAnalysis() {
  const [, setLocation] = useLocation();
  const [month] = useState(() => new Date().getMonth() + 1);
  const [year] = useState(() => new Date().getFullYear());

  const generateAnalysis = trpc.finance.generateAIAnalysis.useMutation();

  const handleGenerateAnalysis = async () => {
    try {
      await generateAnalysis.mutateAsync({ month, year });
      toast.success("Análise gerada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar análise: " + error.message);
    }
  };

  const handleExportPDF = () => {
    if (!generateAnalysis.data?.analysis) {
      toast.error("Nenhuma análise disponível para exportar");
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Cabeçalho com logo (usando texto como placeholder)
      doc.setFontSize(24);
      doc.setTextColor(139, 92, 246); // Violet-500
      doc.text("PLANEJAMENTO FINANCEIRO", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text("Análise Financeira com Inteligência Artificial", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Linha separadora
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Título da análise
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(`Parecer Financeiro - ${month}/${year}`, margin, yPosition);
      yPosition += 10;

      // Conteúdo da análise (remover markdown básico)
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      const analysisText = typeof generateAnalysis.data.analysis === 'string' 
        ? generateAnalysis.data.analysis 
        : JSON.stringify(generateAnalysis.data.analysis);
      
      // Remover markdown básico e quebrar em linhas
      const cleanText = analysisText
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Remove links

      const lines = doc.splitTextToSize(cleanText, contentWidth);
      
      for (const line of lines) {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 6;
      }

      // Rodapé com data de geração
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        const footerText = `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: "center" });
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
      }

      // Download do PDF
      doc.save(`analise-financeira-${month}-${year}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar PDF: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="container max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                Análise Financeira com IA
              </h1>
              <p className="text-muted-foreground mt-1">
                Parecer inteligente sobre suas finanças
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateAnalysis}
              disabled={generateAnalysis.isPending}
              className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generateAnalysis.isPending ? "Gerando..." : "Gerar Análise"}
            </Button>
            {generateAnalysis.data && (
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        {generateAnalysis.isPending && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Analisando seus dados financeiros...
              </p>
            </CardContent>
          </Card>
        )}

        {!generateAnalysis.isPending && !generateAnalysis.data && (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-16 w-16 text-violet-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Pronto para analisar suas finanças?
              </h3>
              <p className="text-muted-foreground mb-6">
                Clique em "Gerar Análise" para receber um parecer detalhado com
                insights e recomendações personalizadas.
              </p>
            </CardContent>
          </Card>
        )}

        {generateAnalysis.data && generateAnalysis.data.success && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Parecer Financeiro - {month}/{year}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none dark:prose-invert">
              <Streamdown>{typeof generateAnalysis.data.analysis === 'string' ? generateAnalysis.data.analysis : JSON.stringify(generateAnalysis.data.analysis)}</Streamdown>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
