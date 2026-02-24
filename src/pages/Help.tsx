import { useState, useMemo } from 'react';
import { Search, ChevronDown, HelpCircle, MessageCircle, Mail } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/layout/PageHeader';
import { pageCardClasses } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';

/** Links de contato (configuráveis) */
const CONTACT_WHATSAPP = 'https://wa.me/554197128458?text=Olá%2C%20sou%20usuário%20do%20CotaPro%20e%20gostaria%20de%20tirar%20uma%20dúvida.';
const CONTACT_EMAIL = 'https://mail.google.com/mail/?view=cm&fs=1&to=suporte.cotapro@gmail.com&su=Ajuda%20CotaPro&body=Olá%2C%20sou%20usuário%20do%20CotaPro%20e%20gostaria%20de%20tirar%20uma%20dúvida.';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'primeiros-passos',
    title: 'Como obter o máximo desempenho com o CotaPro',
    items: [
      {
        question: '1. Comece configurando sua base corretamente',
        answer:
          'Antes de criar orçamentos, configure sua empresa com atenção. Preencha corretamente: nome da empresa, endereço, dados de contato, logotipo (se tiver) e chave Pix. Essas informações aparecem automaticamente nos seus orçamentos e no PDF final. Quanto mais completo estiver seu cadastro, mais profissional será sua proposta. Orçamento bem apresentado aumenta a chance de fechamento.',
      },
      {
        question: '2. Organize seu catálogo para ganhar velocidade',
        answer:
          'Cadastre seus principais produtos ou serviços no Catálogo com: nome claro, descrição detalhada, unidade correta (UN, M2, HORA, etc) e valor atualizado. Isso permite criar orçamentos em segundos, sem digitar tudo novamente. Catálogo bem organizado = menos erros e mais agilidade.',
      },
      {
        question: '3. Monte orçamentos completos e claros',
        answer:
          'Ao criar um orçamento: selecione o cliente correto, use itens do catálogo sempre que possível, revise descrições e valores e verifique se o Pix está configurado. O CotaPro gera automaticamente o PDF com seus dados e QR Code Pix. Orçamento claro e profissional transmite confiança.',
      },
      {
        question: '4. Não envie só o orçamento. Faça acompanhamento.',
        answer:
          'Depois de enviar o orçamento: use a mensagem sugerida, marque como enviado e retome o cliente caso não responda. Negociações esfriam rápido. Quem acompanha, fecha. Organização e insistência inteligente aumentam seu faturamento.',
      },
      {
        question: '5. Use o PDF como ferramenta de fechamento',
        answer:
          'O PDF do CotaPro é gerado com: dados da sua empresa, itens organizados, totais automáticos e QR Code Pix. Isso facilita o pagamento e reduz atritos na hora do cliente decidir. Quanto mais simples pagar, maior a chance de fechar.',
      },
    ],
  },
  {
    id: 'orcamentos',
    title: 'Orçamentos: como usar para fechar mais vendas',
    items: [
      {
        question: '1. Use os status para não perder negociações',
        answer:
          'Cada orçamento tem um status que ajuda você a acompanhar o andamento da venda.\n\n- Rascunho: ainda não enviado\n- Enviado: aguardando resposta\n- Aprovado: cliente confirmou\n- Recusado: negociação encerrada\n- Expirado: passou da validade\n\nAtualize os status com frequência. Isso permite saber rapidamente onde agir e evita esquecer oportunidades. Orçamentos sem acompanhamento viram vendas perdidas.',
      },
      {
        question: '2. Defina prazos para gerar urgência',
        answer:
          'A validade do orçamento informa até quando os valores são garantidos.\n\nDefinir um prazo:\n- Gera senso de urgência\n- Evita negociações eternas\n- Protege você de variações de preço\n\nOrçamento sem prazo tende a ser ignorado.',
      },
      {
        question: '3. Revise antes de enviar — confiança gera fechamento',
        answer:
          'Antes de enviar:\n- Verifique valores\n- Revise descrições\n- Confirme dados do cliente\n- Confira se o Pix está correto\n\nDepois de enviado, evite mudanças constantes, pois isso pode gerar insegurança. Clareza e consistência aumentam a confiança do cliente.',
      },
      {
        question: '4. Entenda exatamente o que o cliente recebe',
        answer:
          'O link público mostra:\n- Dados da sua empresa\n- Lista organizada de itens\n- Total atualizado\n- QR Code Pix (se configurado)\n\nEle é pensado para ser simples e fácil de entender no celular. Quanto mais claro for o orçamento, menor a chance de objeções.',
      },
    ],
  },
  {
    id: 'pix-qrcode',
    title: 'Pix e QR Code: facilite o pagamento e feche mais rápido',
    items: [
      {
        question: 'Configure o Pix corretamente para evitar atritos',
        answer:
          'Em Configurações, preencha a chave Pix (CPF, CNPJ, e-mail ou telefone), o tipo e o nome do titular exatamente como está no banco. O QR Code é gerado automaticamente em todos os PDFs. Chave errada ou desatualizada gera frustração na hora do pagamento e pode fazer o cliente desistir. Configure uma vez e feche mais vendas.',
      },
      {
        question: 'Entenda como o Pix aparece no orçamento',
        answer:
          'O PDF do CotaPro inclui um QR Code com o valor total do orçamento. O cliente escaneia com o app do banco e paga na hora. Também aparecem a chave em texto e as informações do titular. Quanto mais fácil pagar, maior a chance de fechamento. O Pix no orçamento reduz atritos e acelera o recebimento.',
      },
      {
        question: 'Evite erros que atrasam o pagamento',
        answer:
          'Verifique se a chave está correta e ativa no banco. O nome do titular deve coincidir com o cadastrado. Se o QR Code não funcionar, confira valor e chave. Erros de Pix geram desconfiança e atrasam o fechamento. Revise antes de enviar e evite perder vendas por detalhes técnicos.',
      },
    ],
  },
  {
    id: 'clientes-catalogo',
    title: 'Clientes e Catálogo: organização que vira faturamento',
    items: [
      {
        question: 'Organize clientes e itens para ganhar tempo',
        answer:
          'Use nomes claros nos clientes para encontrar rápido na busca. No catálogo, cadastre produtos e serviços com descrições objetivas e valores atualizados. Organização evita erros, acelera a criação de orçamentos e permite focar em quem realmente pode fechar. Desorganização custa vendas.',
      },
      {
        question: 'Por que não consigo excluir cliente com orçamentos?',
        answer:
          'Clientes vinculados a orçamentos não podem ser excluídos diretamente. Primeiro exclua ou finalize os orçamentos relacionados. Depois disso, a exclusão será liberada. Isso protege o histórico e evita inconsistências que podem prejudicar seu acompanhamento de vendas.',
      },
    ],
  },
  {
    id: 'erros-perder-vendas',
    title: 'Erros que fazem você perder vendas (e como evitar)',
    items: [
      {
        question: 'Não revisar o orçamento antes de enviar',
        answer:
          'Erros de valor, descrição ou dados do cliente geram desconfiança e podem fazer o cliente desistir. Antes de enviar: verifique valores, revise descrições, confirme dados do cliente e confira o Pix. Alguns minutos de revisão podem evitar a perda de uma venda.',
      },
      {
        question: 'Não fazer acompanhamento',
        answer:
          'Negociações esfriam rápido. Orçamentos enviados e esquecidos viram vendas perdidas. Use os status para saber quem precisa de retorno. Retome o cliente se não houver resposta. Quem acompanha, fecha. Acompanhamento organizado aumenta o faturamento.',
      },
      {
        question: 'Não definir prazo de validade',
        answer:
          'Orçamento sem prazo tende a ser ignorado. Defina uma data de validade para gerar urgência e proteger-se de variações de preço. Prazo claro ajuda o cliente a decidir e evita negociações eternas que raramente fecham.',
      },
      {
        question: 'Não enviar uma proposta clara e fácil de entender',
        answer:
          'Orçamento confuso gera objeções e atrasa o fechamento. Use descrições claras, itens organizados e totais visíveis. O link público do CotaPro é pensado para ser simples no celular. Quanto mais claro, menor a chance de o cliente desistir por dúvida.',
      },
      {
        question: 'Não organizar seus clientes',
        answer:
          'Clientes e itens desorganizados geram erros, atrasos e orçamentos incorretos. Cadastre com nomes claros, mantenha o catálogo atualizado e use os filtros. Organização permite criar orçamentos em segundos e focar em quem realmente pode fechar.',
      },
      {
        question: 'Não enviar o orçamento rapidamente',
        answer:
          'Quanto mais rápido você envia, menor o risco do cliente esfriar. Envie o orçamento no mesmo momento ou o mais rápido possível após a conversa. Velocidade reduz atrito e aumenta suas chances de fechamento.',
      },
      {
        question: 'Não reduzir o esforço do cliente para pagar',
        answer:
          'Orçamento claro, PDF organizado e QR Code Pix configurado facilitam a decisão. Quanto menos etapas o cliente tiver para pagar, maior a chance de fechar na hora.',
      },
      {
        question: 'Não cadastrar produtos e variações corretamente',
        answer:
          'Preencha todos os seus produtos, serviços e variações no catálogo. Você investe um tempo maior na primeira vez, mas depois agiliza seu dia a dia e reduz erros. Catálogo completo significa orçamento mais rápido e profissional.',
      },
      {
        question: 'Não criar uma rotina de acompanhamento',
        answer:
          'Monte uma rotina diária para revisar orçamentos aguardando aprovação. Defina um momento fixo no seu expediente para acompanhar negociações.',
      },
      {
        question: 'Não usar mensagens estratégicas de follow-up',
        answer:
          'Dispare as mensagens sugeridas de acordo com o contexto atual do cliente e do orçamento. De preferência no início do seu expediente, para acompanhar as respostas ao longo do dia e conduzir melhor as negociações.',
      },
    ],
  },
  {
    id: 'seguranca',
    title: 'Segurança e privacidade',
    items: [
      {
        question: 'O que é público e o que é privado no sistema?',
        answer:
          'No CotaPro, suas informações são separadas por conta e protegidas por login.\n\n🔐 Privado:\n- Sua lista de clientes\n- Seu catálogo\n- Seus orçamentos internos\n- Configurações da empresa\n- Dados financeiros\n\nNada disso é acessível sem seu login.\n\n🌍 Público:\n- Apenas o link do orçamento que você decide enviar ao cliente.\n\nO cliente vê somente aquele orçamento específico, sem acesso a outras informações da sua conta.\n\nSeus dados não são compartilhados com terceiros.',
      },
    ],
  },
];

function FaqAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-slate-100 dark:border-[rgb(var(--border))]/60 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 py-4 text-left hover:bg-white/10 dark:hover:bg-white/5 transition-colors px-1 -mx-1 rounded-lg"
      >
        <span className="font-medium text-[rgb(var(--fg))]">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 dark:text-slate-300 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="pb-4 pt-0 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

export function Help() {
  const [search, setSearch] = useState('');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const searchLower = (search ?? '').toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    if (!searchLower) return FAQ_DATA;
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.question.toLowerCase().includes(searchLower) ||
          item.answer.toLowerCase().includes(searchLower) ||
          cat.title.toLowerCase().includes(searchLower)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchLower]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-36 lg:pb-6">
      <PageHeader
        title="Central de Ajuda"
        subtitle="Encontre respostas rápidas para as dúvidas mais comuns"
      />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar perguntas ou respostas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl"
        />
      </div>

      <div className="space-y-6">
        {filteredCategories.length === 0 ? (
          <Card className={pageCardClasses}>
            <CardContent className="py-12 px-6 text-center">
              <HelpCircle className="h-12 w-12 text-slate-300 dark:text-slate-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-300 font-medium">Nenhum resultado encontrado</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Tente outros termos de busca
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCategories.map((category) => (
            <Card key={category.id} className={pageCardClasses}>
              <CardContent className="p-0">
                <div className="px-4 pt-4 pb-2">
                  <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">{category.title}</h2>
                </div>
                <div className="px-4 pb-4">
                  {category.items.map((item, idx) => {
                    const itemId = `${category.id}-${idx}`;
                    return (
                      <FaqAccordionItem
                        key={itemId}
                        question={item.question}
                        answer={item.answer}
                        isOpen={openIds.has(itemId)}
                        onToggle={() => toggleItem(itemId)}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className={pageCardClasses}>
        <CardContent className="py-8 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[rgb(var(--fg))]">Precisa de ajuda ou quer sugerir melhorias?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Se tiver dúvidas, dificuldades ou ideias para melhorar o CotaPro, fale com a gente. Seu feedback ajuda a evoluir o sistema para vendedores como você.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={CONTACT_WHATSAPP} target="_blank" rel="noopener noreferrer">
                <Button variant="default" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </a>
              <a href={CONTACT_EMAIL} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
