import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Check } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SmartCategorySelectorProps {
  description: string;
  amount: number;
  value?: number; // categoryId
  onValueChange: (categoryId: number) => void;
  categories: Array<{ id: number; name: string; type: string }>;
}

export function SmartCategorySelector({
  description,
  amount,
  value,
  onValueChange,
  categories,
}: SmartCategorySelectorProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(value);

  const learnMutation = trpc.finance.learnClassification.useMutation();

  // Get AI suggestions quando description muda
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    trpc.finance.classifyTransactionAdvanced.useQuery(
      {
        description: description || "",
        amount: amount || 0,
      },
      {
        enabled: description.length > 2 && amount !== 0, // Só busca se tiver dados
      }
    );

  // Mostrar sugestões automaticamente se houver
  useEffect(() => {
    if (suggestions.length > 0 && !selectedCategoryId) {
      setShowSuggestions(true);
    }
  }, [suggestions, selectedCategoryId]);

  const handleSelectCategory = async (categoryId: number, source: "manual" | "confirmed" = "manual") => {
    setSelectedCategoryId(categoryId);
    onValueChange(categoryId);
    setShowSuggestions(false);

    // Ensinar a IA
    if (description && amount) {
      try {
        await learnMutation.mutateAsync({
          description,
          amount,
          categoryId,
          source,
        });
      } catch (error) {
        console.error("Erro ao aprender classificação:", error);
      }
    }
  };

  const handleConfirmSuggestion = async (suggestionCategoryName: string) => {
    const category = categories.find((c) => c.name === suggestionCategoryName);
    if (category) {
      await handleSelectCategory(category.id, "confirmed");
    }
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "bg-green-100 text-green-800 border-green-300";
    if (confidence >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return "Alta";
    if (confidence >= 60) return "Média";
    return "Baixa";
  };

  return (
    <div className="space-y-2">
      {/* Seletor principal */}
      <Select
        value={selectedCategoryId?.toString()}
        onValueChange={(val) => handleSelectCategory(parseInt(val), "manual")}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione a categoria">
            {selectedCategory ? selectedCategory.name : "Selecione a categoria"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id.toString()}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Botão de sugestões IA */}
      {suggestions.length > 0 && !showSuggestions && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSuggestions(true)}
          className="w-full"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ver {suggestions.length} sugestões da IA
        </Button>
      )}

      {/* Cards de sugestões */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="p-3 space-y-2 border-primary/20">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Sugestões Inteligentes
          </div>

          {suggestions.map((suggestion, index) => {
            const category = categories.find((c) => c.name === suggestion.categoryName);

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleConfirmSuggestion(suggestion.categoryName)}
                disabled={!category}
                className="w-full flex items-center justify-between p-2 rounded-lg border hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-1">
                  <div className="font-medium">{suggestion.categoryName}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {suggestion.categoryType === "income"
                      ? "Receita"
                      : suggestion.categoryType === "expense"
                      ? "Despesa"
                      : "Investimento"}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={getConfidenceColor(suggestion.confidence)}
                  >
                    {suggestion.confidence}% {getConfidenceLabel(suggestion.confidence)}
                  </Badge>
                  {category && (
                    <Check className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSuggestions(false)}
            className="w-full mt-2"
          >
            Fechar
          </Button>
        </Card>
      )}

      {/* Loading state */}
      {loadingSuggestions && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Sparkles className="h-3 w-3 animate-pulse" />
          Analisando com IA...
        </div>
      )}
    </div>
  );
}
