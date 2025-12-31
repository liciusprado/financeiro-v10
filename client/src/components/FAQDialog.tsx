import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Search, BookOpen, Rocket, Shield, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'geral' | 'transacoes' | 'seguranca' | 'avancado' | 'troubleshooting';
  tags: string[];
}

const FAQ_ITEMS: FAQItem[] = [
  // Geral
  {
    id: 'what-is',
    question: 'O que é este sistema?',
    answer: 'É um sistema completo de planejamento financeiro pessoal e familiar. Você pode controlar receitas, despesas, criar metas, gerar relatórios e muito mais. Funciona offline e sincroniza automaticamente!',
    category: 'geral',
    tags: ['básico', 'introdução'],
  },
  {
    id: 'free',
    question: 'O sistema é gratuito?',
    answer: 'Sim! Todo o sistema é gratuito para uso pessoal e familiar. Não há limites de transações ou funcionalidades bloqueadas.',
    category: 'geral',
    tags: ['preço', 'plano'],
  },
  {
    id: 'offline',
    question: 'Funciona sem internet?',
    answer: 'Sim! O sistema funciona 100% offline. Você pode adicionar transações, ver relatórios e usar todas as funcionalidades. Quando voltar online, tudo sincroniza automaticamente.',
    category: 'geral',
    tags: ['offline', 'pwa'],
  },
  {
    id: 'mobile',
    question: 'Posso instalar no celular?',
    answer: 'Sim! É um Progressive Web App (PWA). No Chrome/Safari, clique em "Adicionar à tela inicial". Funciona como um app nativo!',
    category: 'geral',
    tags: ['mobile', 'pwa', 'app'],
  },

  // Transações
  {
    id: 'add-transaction',
    question: 'Como adiciono uma despesa?',
    answer: 'Vá em "Despesas" no menu → Clique "+ Nova Despesa" → Preencha valor, categoria e descrição → Salvar. Pronto! A IA já categoriza automaticamente.',
    category: 'transacoes',
    tags: ['despesa', 'adicionar', 'básico'],
  },
  {
    id: 'categories',
    question: 'Como funcionam as categorias?',
    answer: 'Categorias organizam seus gastos (ex: Alimentação, Transporte). O sistema tem categorias padrão, mas você pode criar as suas. A IA aprende e sugere categorias automaticamente!',
    category: 'transacoes',
    tags: ['categoria', 'organização'],
  },
  {
    id: 'recurring',
    question: 'Como marco despesas recorrentes?',
    answer: 'Ao adicionar/editar uma despesa, marque "Recorrente". Defina a frequência (mensal, quinzenal, etc). O sistema criará automaticamente nos próximos meses!',
    category: 'transacoes',
    tags: ['recorrente', 'automático'],
  },
  {
    id: 'edit-delete',
    question: 'Posso editar ou deletar transações?',
    answer: 'Sim! Clique na transação → "Editar" para modificar ou "Deletar" para remover. Se for colaborativo, pode precisar de aprovação do Admin.',
    category: 'transacoes',
    tags: ['editar', 'deletar'],
  },

  // Segurança
  {
    id: 'secure',
    question: 'Meus dados estão seguros?',
    answer: 'Sim! Usamos criptografia end-to-end, HTTPS obrigatório, JWT para autenticação e backups automáticos. Credenciais bancárias são criptografadas e nunca armazenadas no servidor.',
    category: 'seguranca',
    tags: ['segurança', 'privacidade'],
  },
  {
    id: 'bank-credentials',
    question: 'É seguro conectar meu banco?',
    answer: 'Sim! Usamos Belvo, certificado pelo Banco Central. Suas credenciais são criptografadas end-to-end e NUNCA ficam no nosso servidor. Você pode revogar acesso a qualquer momento.',
    category: 'seguranca',
    tags: ['banco', 'belvo', 'open banking'],
  },
  {
    id: 'who-sees',
    question: 'Quem pode ver meus dados?',
    answer: 'Apenas você! Em modo colaborativo, apenas membros do SEU grupo veem. Cada grupo é isolado. Seus dados nunca são compartilhados com terceiros.',
    category: 'seguranca',
    tags: ['privacidade', 'dados'],
  },

  // Avançado
  {
    id: 'gamification',
    question: 'Como funciona a gamificação?',
    answer: 'Você ganha XP por ações: login diário (+10), adicionar despesa (+5), completar meta (+200). Suba de nível e desbloqueie conquistas! É uma forma divertida de se manter motivado.',
    category: 'avancado',
    tags: ['gamificação', 'xp', 'conquistas'],
  },
  {
    id: 'open-banking',
    question: 'O que é Open Banking?',
    answer: 'Permite conectar seu banco e importar transações automaticamente. Economiza tempo e evita erros. Usamos Belvo (certificado BC) para segurança máxima.',
    category: 'avancado',
    tags: ['open banking', 'belvo'],
  },
  {
    id: 'collaborative',
    question: 'Como usar em família?',
    answer: 'Ative "Modo Colaborativo" → Crie um grupo → Convide membros por email → Defina permissões (Admin/Editor/Viewer). Todos veem e colaboram nas finanças!',
    category: 'avancado',
    tags: ['colaborativo', 'família'],
  },
  {
    id: 'ai',
    question: 'Como a IA ajuda?',
    answer: 'A IA categoriza transações automaticamente (85% precisão), detecta gastos incomuns, prevê saldo futuro e dá insights personalizados. Aprende com você!',
    category: 'avancado',
    tags: ['ia', 'inteligência artificial'],
  },

  // Troubleshooting
  {
    id: 'not-syncing',
    question: 'Dados não estão sincronizando',
    answer: 'Verifique: 1) Internet conectada? 2) Fez login? 3) Tente recarregar (F5). Se persistir, vá em Configurações → Forçar Sincronização.',
    category: 'troubleshooting',
    tags: ['erro', 'sync'],
  },
  {
    id: 'forgot-password',
    question: 'Esqueci minha senha',
    answer: 'Na tela de login, clique "Esqueci minha senha" → Digite seu email → Você receberá um link para redefinir.',
    category: 'troubleshooting',
    tags: ['senha', 'login'],
  },
  {
    id: 'lost-data',
    question: 'Perdi meus dados, e agora?',
    answer: 'Não se preocupe! Vá em "Backup" → "Restaurar Backup" → Escolha o backup mais recente. Backups são feitos automaticamente a cada 24h.',
    category: 'troubleshooting',
    tags: ['backup', 'recuperar'],
  },
];

const CATEGORY_INFO = {
  geral: { label: 'Geral', icon: BookOpen, color: 'blue' },
  transacoes: { label: 'Transações', icon: Zap, color: 'green' },
  seguranca: { label: 'Segurança', icon: Shield, color: 'red' },
  avancado: { label: 'Recursos Avançados', icon: Rocket, color: 'purple' },
  troubleshooting: { label: 'Problemas', icon: HelpCircle, color: 'orange' },
};

export function FAQDialog() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredFAQs = FAQ_ITEMS.filter((faq) => {
    const matchesSearch =
      search === '' ||
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase()) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ajuda e FAQ">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-6 w-6" />
            Central de Ajuda
          </DialogTitle>
          <DialogDescription>
            Perguntas frequentes e guias rápidos
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na ajuda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all">Todas</TabsTrigger>
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <TabsTrigger key={key} value={key} className="gap-1">
                <info.icon className="h-3 w-3" />
                {info.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value={activeCategory} className="mt-0">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma resposta encontrada</p>
                  <p className="text-sm">Tente outros termos de busca</p>
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFAQs.map((faq) => {
                    const categoryInfo = CATEGORY_INFO[faq.category];
                    return (
                      <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-start gap-3 text-left">
                            <categoryInfo.icon className={`h-5 w-5 text-${categoryInfo.color}-600 flex-shrink-0 mt-0.5`} />
                            <span className="font-medium">{faq.question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            <p className="text-sm text-muted-foreground">{faq.answer}</p>
                            <div className="flex gap-2 flex-wrap">
                              {faq.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </TabsContent>
          </div>
        </Tabs>

        {/* Footer */}
        <div className="border-t pt-4 flex items-center justify-between text-sm text-muted-foreground">
          <p>Não encontrou sua dúvida?</p>
          <Button variant="link" size="sm">
            Entrar em contato
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * FAQ Inline (para usar em páginas específicas)
 */
export function InlineFAQ({ category }: { category: string }) {
  const faqs = FAQ_ITEMS.filter((faq) => faq.category === category);

  if (faqs.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <HelpCircle className="h-5 w-5" />
        Perguntas Frequentes
      </h3>
      <Accordion type="single" collapsible className="space-y-2">
        {faqs.slice(0, 3).map((faq) => (
          <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
