import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { addDays, generateId } from '../lib/utils';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { QuotePDFTemplate } from '../lib/pdf-generator';
import type { Quote, Company, Customer, Address, QuoteItem } from '../types';

function normalizeItems(raw: unknown): QuoteItem[] {
  let arr: any[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  } else {
    arr = [];
  }

  return (arr || []).map((it: any) => {
    const quantidade = Number(it?.quantidade ?? it?.qty ?? 0) || 0;
    const valorUnitario = Number(it?.valor_unitario ?? it?.unit_price ?? it?.valor ?? 0) || 0;
    const subtotal =
      Number(it?.subtotal ?? 0) || (quantidade && valorUnitario ? quantidade * valorUnitario : 0);
    return {
      id: String(it?.id ?? it?._id ?? generateId()),
      tipo: (it?.tipo as QuoteItem['tipo']) || 'servico',
      descricao: String(it?.descricao ?? it?.description ?? it?.name ?? '').trim(),
      quantidade,
      unidade: String(it?.unidade ?? it?.unit ?? '').trim(),
      valor_unitario: valorUnitario,
      subtotal,
    };
  });
}

function toIsoDateOnly(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function PublicQuote() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [templateQuote, setTemplateQuote] = useState<Quote | null>(null);
  const [templateCompany, setTemplateCompany] = useState<Company | null>(null);

  const canRenderTemplate = Boolean(templateQuote && templateCompany);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);

      if (!id || !isSupabaseConfigured) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const { data: qData, error: qError } = await supabase
          .from('quotes')
          .select('*')
          .eq('id', id)
          .single();

        // Por segurança: qualquer erro/ausência vira "não encontrado"
        if (qError || !qData) {
          if (!cancelled) {
            setTemplateQuote(null);
            setTemplateCompany(null);
            setNotFound(true);
          }
          return;
        }

        const q: any = qData;
        const createdAt = q.created_at ? new Date(q.created_at) : new Date();
        const dataEmissao = (q.data_emissao && String(q.data_emissao)) || toIsoDateOnly(createdAt);

        let dataValidade: string;
        if (q.data_validade) {
          dataValidade = String(q.data_validade);
        } else {
          const daysRaw = q.validity_days;
          const days =
            daysRaw === null || daysRaw === undefined ? null : Number(daysRaw);
          dataValidade =
            days && !Number.isNaN(days) ? toIsoDateOnly(addDays(createdAt, days)) : toIsoDateOnly(createdAt);
        }

        // Itens (normaliza e também força para `itens` para o template)
        const itens = normalizeItems(q.items ?? q.itens);
        const subtotalCalc = itens.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);

        // Cliente (busca snapshot completo; se RLS bloquear, usa placeholders)
        const emptyAddress: Address = {
          rua: '',
          numero: '',
          complemento: '',
          bairro: '',
          cidade: '',
          estado: '',
          cep: '',
        };

        let cliente: Customer = {
          id: String(q.customer_id ?? ''),
          tipo: 'pessoa_fisica',
          nome: 'Cliente',
          cpf_cnpj: '',
          telefone: '',
          email: '',
          endereco: emptyAddress,
          observacoes: '',
          data_cadastro: dataEmissao,
        };

        try {
          const { data: cData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', q.customer_id)
            .maybeSingle();
          if (cData) {
            const c: any = cData;
            cliente = {
              id: String(c.id ?? q.customer_id ?? ''),
              tipo: c.tipo === 'pessoa_juridica' ? 'pessoa_juridica' : 'pessoa_fisica',
              nome: String(c.nome ?? 'Cliente'),
              cpf_cnpj: String(c.cpf_cnpj ?? ''),
              telefone: String(c.telefone ?? ''),
              email: String(c.email ?? ''),
              endereco: (c.endereco as Address) ?? emptyAddress,
              observacoes: String(c.observacoes ?? ''),
              data_cadastro: String(c.data_cadastro ?? dataEmissao),
            };
          }
        } catch {
          // mantém placeholder
        }

        // Company (tenta buscar do profile via user_id; fallback seguro se RLS bloquear)
        const fallbackCompany: Company = {
          id: String(q.user_id ?? 'public'),
          nome: 'CotaPro',
          cnpj: '',
          telefone: '',
          email: '',
          endereco: emptyAddress,
          logo_url: '',
        };

        let company: Company = fallbackCompany;
        let profileDefaultNotes = '';
        if (q.user_id) {
          try {
            const { data: pData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', q.user_id)
              .maybeSingle();

            if (pData) {
              const p: any = pData;
              profileDefaultNotes = String(p.default_notes ?? '').trim();
              company = {
                id: String(p.id ?? q.user_id),
                nome: String(p.company_name ?? p.nome ?? fallbackCompany.nome),
                cnpj: String(p.cnpj ?? ''),
                telefone: String(p.phone ?? ''),
                email: String(p.email ?? ''),
                logo_url: String(p.logo_url ?? ''),
                endereco: {
                  rua: String(p.street ?? ''),
                  numero: String(p.number ?? ''),
                  complemento: String(p.complement ?? ''),
                  bairro: String(p.district ?? ''),
                  cidade: String(p.city ?? ''),
                  estado: String(p.state ?? ''),
                  cep: String(p.cep ?? ''),
                },
              };
            }
          } catch {
            company = fallbackCompany;
          }
        }

        if (!cancelled) {
          const descontoTipo = (q.desconto_tipo as Quote['desconto_tipo']) || 'percentual';
          const descontoValor = Number(q.desconto_valor ?? 0) || 0;
          const subtotal = Number(q.subtotal ?? subtotalCalc) || 0;
          const total = Number(q.total ?? q.total_value ?? subtotal) || 0;
          const quoteObsRaw = String((q.observacoes ?? q.notes ?? '')).trim();
          const observacoes = quoteObsRaw || profileDefaultNotes || '';

          const quoteForTemplate: Quote = {
            id: String(q.id),
            numero: (q.quote_number ?? q.number ?? '') as any,
            cliente_id: String(q.customer_id ?? ''),
            cliente,
            data_emissao: String(dataEmissao),
            data_validade: String(dataValidade),
            status: (q.status as Quote['status']) || 'enviado',
            itens,
            subtotal,
            desconto_tipo: descontoTipo,
            desconto_valor: descontoValor,
            total,
            observacoes,
            data_criacao: String(toIsoDateOnly(createdAt)),
          };

          setTemplateQuote(quoteForTemplate);
          setTemplateCompany(company);
          setNotFound(false);
        }
      } catch {
        if (!cancelled) {
          setTemplateQuote(null);
          setTemplateCompany(null);
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-page-bg">
      {/* Ajustes de responsividade (não afeta PDF) */}
      <style>{`
        /* Remove altura fixa para exibir todos os itens na página pública */
        #public-quote-template #quote-pdf-page {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }
        #public-quote-template #quote-pdf-template {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }
        #public-quote-template #quote-items-section {
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          overflow: visible !important;
        }

        /* Ocultar assinaturas apenas na página pública (não afeta PDF) */
        #public-quote-template #quote-pdf-signatures,
        #public-quote-template #quote-signatures,
        #public-quote-template .quote-signatures,
        #public-quote-template [id*="signature"],
        #public-quote-template [class*="signature"] {
          display: none !important;
        }

        /* Espaçamento entre blocos principais */
        #public-quote-template #quote-pdf-header-block { margin-bottom: 1.5rem !important; }
        #public-quote-template #quote-pdf-cliente { margin-bottom: 1.5rem !important; }
        #public-quote-template #quote-items-section { margin-bottom: 1.5rem !important; }
        #public-quote-template #quote-pdf-footer { margin-bottom: 1.5rem !important; }

        /* Evitar quebra de números e valores importantes */
        #public-quote-template #quote-pdf-number,
        #public-quote-template #quote-pdf-total,
        #public-quote-template #quote-pdf-header-block > div:last-child p,
        #public-quote-template #quote-pdf-footer div[style*="space-between"] span { white-space: nowrap !important; }

        /* Tabela: overflow horizontal + min-width */
        #public-quote-template #quote-items-section { overflow-x: auto !important; }
        #public-quote-template #quote-items-section table { min-width: 100% !important; }

        /* Cabeçalho responsivo: 1 col mobile, 2 cols desktop */
        #public-quote-template #quote-pdf-header-block {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
        }
        @media (min-width: 768px) {
          #public-quote-template #quote-pdf-header-block {
            grid-template-columns: 1fr auto !important;
          }
        }

        @media (max-width: 640px) {
          #public-quote-template table {
            table-layout: fixed !important;
            width: 100% !important;
          }
          #public-quote-template td:nth-child(4),
          #public-quote-template td:nth-child(5),
          #public-quote-template th:nth-child(4),
          #public-quote-template th:nth-child(5) {
            width: 90px !important;
            min-width: 90px !important;
            font-size: 12px !important;
            text-align: right !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
          }
          #public-quote-template td {
            white-space: normal !important;
          }
        }

        @media (max-width: 768px) {
          #public-quote-template #quote-pdf-page {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
          }
          #public-quote-template #quote-pdf-template {
            width: 100% !important;
            padding: 16px !important;
            font-size: 12px !important;
          }
          #public-quote-template table { font-size: 12px !important; }
          #public-quote-template th,
          #public-quote-template td { padding: 8px 6px !important; }
          #public-quote-template #quote-pdf-template td:nth-child(2) {
            max-width: 180px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          #public-quote-template.pq-compact #quote-pdf-template table { font-size: 11px !important; }
          #public-quote-template.pq-hide-desc #quote-pdf-template td:nth-child(2) span { display: none !important; }
          #public-quote-template * { word-break: break-word; }
        }

        @media (max-width: 480px) {
          /* Condições e Observações: quebra correta no mobile */
          #public-quote-template #quote-pdf-footer > div:first-child > div:first-child {
            min-width: 0 !important;
            width: 100% !important;
          }
          #public-quote-template #quote-pdf-footer [style*="pre-wrap"] {
            white-space: pre-wrap !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            line-height: 1.4 !important;
            font-size: 11px !important;
          }
          #public-quote-template #quote-pdf-footer > div:first-child {
            flex-direction: column !important;
          }

          /* Rodapé: empilhar tudo verticalmente, sem sobreposição */
          #public-quote-template #quote-pdf-footer,
          #public-quote-template #quote-pdf-footer > div {
            position: static !important;
          }
          #public-quote-template #quote-pdf-footer {
            flex-direction: column !important;
            gap: 12px !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
          }
          #public-quote-template #quote-pdf-footer > div:first-child {
            flex: none !important;
          }
          #public-quote-template #quote-pdf-footer > div:first-child > div:last-child {
            width: 100% !important;
          }
          #public-quote-template #quote-pdf-footer > div:last-child {
            margin-top: 8px !important;
          }
          #public-quote-template #quote-pdf-footer > div:last-child p {
            font-size: 11px !important;
            line-height: 1.4 !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500">Carregando...</CardContent>
          </Card>
        ) : notFound || !canRenderTemplate ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="font-semibold text-gray-900">Orçamento não encontrado</p>
              <p className="text-sm text-gray-500 mt-1">Verifique se o link está correto.</p>
            </CardContent>
          </Card>
        ) : (
          <div
            id="public-quote-template"
            className={[
              'w-full overflow-x-auto overflow-y-visible border border-gray-200 rounded-lg bg-white',
              ((templateQuote?.itens?.length ?? 0) > 6) ? 'pq-compact' : '',
              ((templateQuote?.itens?.length ?? 0) > 8) ? 'pq-hide-desc' : '',
            ].filter(Boolean).join(' ')}
          >
            <QuotePDFTemplate quote={templateQuote as Quote} company={templateCompany as Company} />
          </div>
        )}
      </div>
    </div>
  );
}

