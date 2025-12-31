import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Pencil,
  Trash2,
  Check,
  X,
  ShoppingCart,
  Home as HomeIcon,
  Car,
  Heart,
  BookOpen,
  DollarSign,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define available icons for categories. Each option has a value (string key), a label and the component.
const ICON_OPTIONS = [
  { value: "shopping-cart", label: "Compras", icon: ShoppingCart },
  { value: "home", label: "Casa", icon: HomeIcon },
  { value: "car", label: "Transporte", icon: Car },
  { value: "heart", label: "Saúde", icon: Heart },
  { value: "book-open", label: "Educação", icon: BookOpen },
  { value: "dollar-sign", label: "Financeiro", icon: DollarSign },
];
// Map icon values to their components for display purposes
const ICON_COMPONENTS: Record<string, any> = {
  "shopping-cart": ShoppingCart,
  home: HomeIcon,
  car: Car,
  heart: Heart,
  "book-open": BookOpen,
  "dollar-sign": DollarSign,
};
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageCategories() {
  const utils = trpc.useUtils();
  
  const { data: categories = [], isLoading } = trpc.finance.listCategories.useQuery();
  const updateCategory = trpc.finance.updateCategory.useMutation({
    onSuccess: () => {
      utils.finance.listCategories.invalidate();
      toast.success("Categoria atualizada com sucesso!");
      setEditingId(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar categoria: " + error.message);
    },
  });
  
  const deleteCategory = trpc.finance.deleteCategory.useMutation({
    onSuccess: () => {
      utils.finance.listCategories.invalidate();
      toast.success("Categoria deletada com sucesso!");
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error) => {
      toast.error("Erro ao deletar categoria: " + error.message);
    },
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const [editingIcon, setEditingIcon] = useState("");
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null);

  const handleEdit = (id: number, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
    const category = categories.find((c) => c.id === id);
    if (category) {
      setEditingColor(category.color || "");
      setEditingIcon(category.icon || "");
      setEditingImageUrl(category.imageUrl || "");
    }
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      updateCategory.mutate({
        id: editingId,
        name: editingName.trim(),
        color: editingColor || undefined,
        icon: editingIcon || undefined,
        imageUrl: editingImageUrl || undefined,
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("");
    setEditingIcon("");
    setEditingImageUrl("");
  };

  const handleDeleteClick = (id: number, name: string) => {
    setCategoryToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (categoryToDelete) {
      deleteCategory.mutate({ id: categoryToDelete.id });
    }
  };

  if (isLoading) {
    return <div className="container py-8">Carregando...</div>;
  }

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Categorias</CardTitle>
          <CardDescription>
            Edite ou exclua categorias personalizadas. Categorias padrão não podem ser modificadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Ícone</TableHead>
                <TableHead>Imagem</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  {/* Nome */}
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="max-w-xs"
                        autoFocus
                      />
                    ) : (
                      category.name
                    )}
                  </TableCell>
                  {/* Tipo */}
                  <TableCell>
                    {category.type === "income"
                      ? "Receita"
                      : category.type === "expense"
                      ? "Despesa"
                      : "Investimento"}
                  </TableCell>
                  {/* Ícone */}
                  <TableCell>
                    {editingId === category.id ? (
                      <Select
                        value={editingIcon}
                        onValueChange={(value) => setEditingIcon(value)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Selecione um ícone" />
                        </SelectTrigger>
                        <SelectContent>
                          {ICON_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value} className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4 mr-2 inline" />
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      (() => {
                        const IconComp = ICON_COMPONENTS[category.icon as string];
                        return IconComp ? (
                          <IconComp className="h-5 w-5" />
                        ) : (
                          <span>-</span>
                        );
                      })()
                    )}
                  </TableCell>
                  {/* Imagem */}
                  <TableCell>
                    {editingId === category.id ? (
                      <Input
                        value={editingImageUrl}
                        onChange={(e) => setEditingImageUrl(e.target.value)}
                        placeholder="URL da imagem"
                        className="max-w-xs"
                      />
                    ) : category.imageUrl ? (
                      <img
                        src={category.imageUrl}
                        alt="imagem categoria"
                        className="h-8 w-8 object-cover rounded"
                      />
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                  {/* Cor */}
                  <TableCell>
                    {editingId === category.id ? (
                      <input
                        type="color"
                        value={editingColor || "#000000"}
                        onChange={(e) => setEditingColor(e.target.value)}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color || "#000" }}
                        ></span>
                        <span className="text-sm text-muted-foreground">
                          {category.color}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  {/* Ações */}
                  <TableCell className="text-right">
                    {editingId === category.id ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(category.id, category.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(category.id, category.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"?
              {" "}Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
