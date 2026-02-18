import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { addDays, generateId } from '../lib/utils';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { generatePixPayload } from '../lib/pix';
import { PublicQuoteDocument } from '../components/quotes/PublicQuoteDocument';
import QRCode from 'qrcode';
import type { Quote, Company, Customer, Address, QuoteItem } from '../types';

interface PixData {
  pix_key: string;
  pix_name: string;
  pix_city: string | null;
  pix_type: string;
  qrCodeDataUrl: string | null;
}

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
  const [templatePix, setTemplatePix] = useState<PixData | null>(null);

  const canRenderTemplate = Boolean(templateQuote && templateCompany);

  useEffect(() => {
    const metaViewport = document.querySelector('meta[name="viewport"]');
    const originalContent = metaViewport?.getAttribute('content') ?? '';
    metaViewport?.setAttribute(
      'content',
      'width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=3.0, user-scalable=yes'
    );
    document.body.classList.add('public-quote-page');
    return () => {
      metaViewport?.setAttribute('content', originalContent);
      document.body.classList.remove('public-quote-page');
    };
  }, []);

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
            setTemplatePix(null);
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
        let pixData: PixData | null = null;
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
              // Extrair Pix do profile e gerar QR se pix_key existir
              const pixKey = String(p.pix_key ?? '').trim();
              if (pixKey) {
                const pixName = String(p.pix_name ?? '').trim() || company.nome;
                const pixCity = String(p.pix_city ?? '').trim() || null;
                const pixType = String(p.pix_type ?? 'cpf_cnpj').trim();
                try {
                  const payload = generatePixPayload({
                    key: pixKey,
                    name: pixName,
                    city: pixCity,
                    type: pixType,
                  });
                  const qrCodeDataUrl = await QRCode.toDataURL(payload, { width: 256, margin: 2 });
                  pixData = { pix_key: pixKey, pix_name: pixName, pix_city: pixCity, pix_type: pixType, qrCodeDataUrl };
                } catch (err) {
                  console.error('Erro ao gerar QR Pix:', err);
                }
              }
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
          setTemplatePix(pixData);
          setNotFound(false);
        }
      } catch {
        if (!cancelled) {
          setTemplateQuote(null);
          setTemplateCompany(null);
          setTemplatePix(null);
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
    <div className="page-wrapper">
      <style>{`
        .page-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          min-height: 100vh;
          background: #f5f5f5;
          padding: 20px;
        }
        #quote-document {
          width: 800px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        @media (max-width: 768px) {
          .page-wrapper {
            padding: 0;
            background: white;
          }
          #quote-document {
            transform: scale(0.52);
            transform-origin: top center;
            margin: 0 auto;
          }
        }
      `}</style>

      <div className="w-full flex justify-center">
        <>
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
            <PublicQuoteDocument
              quote={templateQuote as Quote}
              company={templateCompany as Company}
              pix={templatePix}
            />
          )}
        </>
      </div>
    </div>
  );
}

