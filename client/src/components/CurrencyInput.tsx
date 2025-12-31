import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useMemo } from "react";

interface CurrencyInputProps {
  value: number; // valor em centavos
  onBlur: (cents: number) => void; // envia centavos
  className?: string;
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right' | 'next' | 'prev') => void;
  dataRow?: number;
  dataCol?: number;
}

export function CurrencyInput({ value, onBlur, className, onNavigate, dataRow, dataCol }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Formatar centavos para exibição (R$ 1.234,56)
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // Preview em tempo real do valor que será salvo
  const previewValue = useMemo(() => {
    if (!isEditing || !displayValue) return null;
    
    // Converter para número em reais
    const normalized = displayValue.replace(/\./g, "").replace(",", ".");
    const numValue = parseFloat(normalized);
    
    if (isNaN(numValue) || numValue === 0) return null;
    
    // Converter para centavos
    const cents = Math.round(numValue * 100);
    return formatCurrency(cents);
  }, [displayValue, isEditing]);

  // Atualizar displayValue quando value mudar (de fora)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    // Mostrar valor numérico sem formatação para facilitar edição
    setDisplayValue((value / 100).toFixed(2).replace(".", ","));
    // Selecionar todo o texto após um pequeno delay
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      inputRef.current?.blur();
      onNavigate?.('up');
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      inputRef.current?.blur();
      onNavigate?.('down');
    } else if (e.key === "ArrowLeft" && inputRef.current?.selectionStart === 0) {
      e.preventDefault();
      inputRef.current?.blur();
      onNavigate?.('left');
    } else if (e.key === "ArrowRight" && inputRef.current?.selectionStart === displayValue.length) {
      e.preventDefault();
      inputRef.current?.blur();
      onNavigate?.('right');
    } else if (e.key === "Tab") {
      e.preventDefault();
      inputRef.current?.blur();
      if (e.shiftKey) {
        onNavigate?.('prev');
      } else {
        onNavigate?.('next');
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
      onNavigate?.('down');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir apenas números, vírgula e ponto
    const rawValue = e.target.value.replace(/[^\d.,]/g, "");
    setDisplayValue(rawValue);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditing(false);
    const rawValue = e.target.value;
    
    // Se vazio, enviar 0
    if (!rawValue || rawValue.trim() === "") {
      setDisplayValue(formatCurrency(0));
      onBlur(0);
      return;
    }

    // Converter para número em reais
    // Formato esperado: "1500" ou "1500,80" ou "1.500,80"
    // Remove pontos (separador de milhares) e substitui vírgula por ponto (decimal)
    const normalized = rawValue.replace(/\./g, "").replace(",", ".");
    const numValue = parseFloat(normalized);

    if (isNaN(numValue)) {
      // Se inválido, manter valor anterior
      setDisplayValue(formatCurrency(value));
      return;
    }

    // Converter para centavos e enviar
    const cents = Math.round(numValue * 100);
    setDisplayValue(formatCurrency(cents));
    onBlur(cents); // Envia centavos!
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={className}
        data-row={dataRow}
        data-col={dataCol}
      />
      {previewValue && (
        <div className="absolute left-0 top-full mt-1 text-xs text-green-400 whitespace-nowrap z-10 bg-gray-900/90 px-2 py-1 rounded">
          Será salvo como: {previewValue}
        </div>
      )}
    </div>
  );
}
