import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Search, HelpCircle, ThumbsUp, Book, Video, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FAQ_DATA = {
  inicio: {
    title: 'Começando',
    icon: HelpCircle,
    questions: [
      {
        q: 'Como começar a usar o sistema?',
        a: 'Bem-vindo! Primeiro, adicione suas primeiras despesas e receitas. Use o botão "+" no menu lateral ou no topo da página. O sistema vai te guiar com um tour interativo na primeira vez.',
      },
      {
        q: 'Preciso conectar meu banco?',
        a: 'Não é obrigatório! Você pode adicionar transações manualmente. O Open Banking é opcional e serve para importar automaticamente suas transações bancárias.',
      },
    ],
  },
  transacoes: {
    title: 'Despesas e Receitas',
    icon: Book,
    questions: [
      {
        q: 'Como adicionar uma despesa?',
        a: 'Clique no botão "+" ou vá em "Despesas" → "Nova Despesa". Preencha o valor, descrição, categoria e data. O sistema pode sugerir a categoria automaticamente!',
      },
      {
        q: 'Como categorizar minhas despesas?',
        a: 'Ao adicionar uma despesa, selecione a categoria. O sistema tem IA que aprende e sugere categorias baseado na descrição. Você também pode criar categorias personalizadas.',
      },
      {
        q: 'Posso editar ou deletar uma transação?',
        a: 'Sim! Clique na transação na lista e escolha "Editar" ou "Deletar". No modo colaborativo, algumas ações podem requerer aprovação.',
      },
    ],
  },
  orcamentos: {
    title: 'Orçamentos',
    icon: ThumbsUp,
    questions: [
      {
        q: 'Como criar um orçamento?',
        a: 'Vá em "Orçamentos" → "Novo Orçamento". Defina um valor limite para uma categoria e período (mensal, anual). O sistema vai alertar quando você ultrapassar.',
      },
      {
        q: 'O que acontece se eu ultrapassar o orçamento?',
        a: 'Você receberá alertas automáticos quando chegar a 80% e 100% do orçamento. No dashboard, a categoria ficará em vermelho. Nada é bloqueado, são apenas avisos!',
      },
    ],
  },
  pwa: {
    title: 'App e Offline',
    icon: Video,
    questions: [
      {
        q: 'Posso usar sem internet?',
        a: 'Sim! Instale o app (botão no topo) e ele funcionará offline. Suas alterações sincronizam automaticamente quando você reconectar.',
      },
      {
        q: 'Como instalar o app?',
        a: 'No Chrome: clique no ícone "Instalar" na barra de endereço. No Safari (iPhone): "Compartilhar" → "Adicionar à Tela de Início". No Android: "Menu" → "Instalar app".',
      },
    ],
  },
  'open-banking': {
    title: 'Open Banking',
    icon: MessageCircle,
    questions: [
      {
        q: 'É seguro conectar meu banco?',
        a: 'Sim! Usamos a Belvo, certificada pelo Banco Central. Suas credenciais são criptografadas e nunca são armazenadas no nosso servidor. Você pode desconectar a qualquer momento.',
      },
      {
        q: 'Quais bancos são suportados?',
        a: 'Suportamos 100+ bancos brasileiros: Banco do Brasil, Bradesco, Itaú, Santander, Caixa, Nubank, Inter, C6, BTG Pactual e muitos outros!',
      },
    ],
  },
  gamificacao: {
    title: 'Gamificação',
    icon: ThumbsUp,
    questions: [
      {
        q: 'Como ganhar XP?',
        a: 'Você ganha XP por ações: adicionar transações (+5 XP), bater metas (+200 XP), login diário (+10 XP), manter streak (+20 XP/dia após 7 dias). Complete conquistas e desafios para ganhar ainda mais!',
      },
      {
        q: 'O que são conquistas?',
        a: 'São medalhas que você desbloqueia ao atingir marcos (ex: "Primeira despesa", "100 transações", "Economizou R$ 10.000"). Cada conquista dá XP bônus!',
      },
    ],
  },
};

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Filtrar perguntas por busca
  const filteredCategories = Object.entries(FAQ_DATA).reduce(
    (acc, [key, category]) => {
      const filtered = category.questions.filter(
        (item) =>
          item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.a.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (filtered.length > 0 || !searchTerm) {
        acc[key] = { ...category, questions: searchTerm ? filtered : category.questions };
      }

      return acc;
    },
    {} as typeof FAQ_DATA
  );

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Central de Ajuda</h1>
        <p className="text-muted-foreground">
          Perguntas frequentes e guias para usar o sistema
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por pergunta ou palavra-chave..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-base">Tutoriais em Vídeo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Assista vídeos curtos sobre cada funcionalidade
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Guia Completo</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leia a documentação detalhada do sistema
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-accent transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Refazer Tour</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ver novamente o tour guiado interativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FAQ por Categoria */}
      <Card>
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
          <CardDescription>
            {searchTerm
              ? `${Object.values(filteredCategories).reduce((acc, cat) => acc + cat.questions.length, 0)} resultados encontrados`
              : 'Selecione uma categoria ou busque sua dúvida'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="grid grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="all">Todas</TabsTrigger>
              {Object.entries(FAQ_DATA).map(([key, cat]) => (
                <TabsTrigger key={key} value={key}>
                  {cat.title}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {Object.entries(filteredCategories).map(([key, category]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <category.icon className="h-4 w-4" />
                    <h3 className="font-semibold">{category.title}</h3>
                    <Badge variant="secondary">{category.questions.length}</Badge>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, idx) => (
                      <AccordionItem key={idx} value={`${key}-${idx}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </TabsContent>

            {Object.entries(FAQ_DATA).map(([key, category]) => (
              <TabsContent key={key} value={key}>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, idx) => (
                    <AccordionItem key={idx} value={`${key}-${idx}`}>
                      <AccordionTrigger className="text-left">
                        {item.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não encontrou sua resposta?{' '}
            <Button variant="link" className="p-0 h-auto">
              Entre em contato com o suporte
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
