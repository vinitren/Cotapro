import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { Quote, Company } from '../types';
import { formatCurrency, formatDate, getQuoteDisplayNumber } from './utils';
import { useStore } from '../store';

interface QuotePDFTemplateProps {
  quote: Quote;
  company: Company;
}

export function QuotePDFTemplate({ quote, company }: QuotePDFTemplateProps) {
  const descontoCalculado =
    quote.desconto_tipo === 'percentual'
      ? (quote.subtotal * quote.desconto_valor) / 100
      : quote.desconto_valor;
 
  // Garantir que items seja um array (pode vir como `items` do banco)
  let items: any[] = [];
  if (Array.isArray((quote as any).itens)) {
    items = (quote as any).itens;
  } else if (typeof (quote as any).itens === 'string') {
    try {
      items = JSON.parse((quote as any).itens);
    } catch {
      items = [];
    }
  } else if (Array.isArray((quote as any).items)) {
    items = (quote as any).items;
  } else if (typeof (quote as any).items === 'string') {
    try {
      items = JSON.parse((quote as any).items);
    } catch {
      items = [];
    }
  } else {
    items = [];
  }

  // PDF fixo: uma única página (A4), altura constante. Área de itens com altura pré-definida.
  const PDF_PAGE_HEIGHT_PX = 1123; // A4 portrait @96dpi
  const PDF_PAGE_WIDTH_PX = 800;
  const ITEMS_SECTION_HEIGHT_PX = 380;

  return (
    <div
      id="quote-pdf-page"
      style={{
        width: PDF_PAGE_WIDTH_PX,
        minWidth: PDF_PAGE_WIDTH_PX,
        maxWidth: PDF_PAGE_WIDTH_PX,
        height: PDF_PAGE_HEIGHT_PX,
        minHeight: PDF_PAGE_HEIGHT_PX,
        maxHeight: PDF_PAGE_HEIGHT_PX,
        marginLeft: 'auto',
        marginRight: 'auto',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <div
        id="quote-pdf-template"
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '32px 36px',
          width: PDF_PAGE_WIDTH_PX,
          height: PDF_PAGE_HEIGHT_PX,
          minHeight: PDF_PAGE_HEIGHT_PX,
          maxHeight: PDF_PAGE_HEIGHT_PX,
          boxSizing: 'border-box',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          color: '#1F2937',
          fontSize: '14px',
          lineHeight: '1.5',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        }}
      >
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '3px solid #1F2937',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {company.logo_url && (
            <img
              src={company.logo_url}
              alt="Logo"
              style={{
                maxHeight: '70px',
                maxWidth: '140px',
                objectFit: 'contain',
              }}
            />
          )}
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1F2937' }}>
              {company.nome}
            </h1>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '13px' }}>
              CNPJ: {company.cnpj} | Tel: {company.telefone}
            </p>
            <p style={{ margin: '2px 0 0', color: '#6B7280', fontSize: '13px' }}>
              {company.email}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              backgroundColor: '#1F2937',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '8px',
            }}
          >
            <p style={{ margin: 0, fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '500' }}>
              Orçamento
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: '700', letterSpacing: '-0.02em' }}>
              #{getQuoteDisplayNumber(quote)}
            </p>
          </div>
          <div style={{ marginTop: '10px' }}>
            <p style={{ margin: 0, color: '#4B5563', fontSize: '13px' }}>
              <strong>Emissão:</strong> {formatDate(quote.data_emissao)}
            </p>
            <p style={{ margin: '2px 0 0', color: '#4B5563', fontSize: '13px' }}>
              <strong>Validade:</strong> {formatDate(quote.data_validade)}
            </p>
          </div>
        </div>
      </div>

      {/* CLIENTE */}
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          backgroundColor: '#F9FAFB',
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
              Cliente
            </p>
            <p style={{ margin: '6px 0 0', fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
              {quote.cliente.nome}
            </p>
            <p style={{ margin: '4px 0 0', color: '#4B5563', fontSize: '14px' }}>
              {quote.cliente.tipo === 'pessoa_fisica' ? 'CPF' : 'CNPJ'}: {quote.cliente.cpf_cnpj} | Tel: {quote.cliente.telefone}
            </p>
          </div>
          {quote.cliente.endereco.cidade && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, color: '#4B5563', fontSize: '14px', fontWeight: '500' }}>
                {quote.cliente.endereco.cidade}/{quote.cliente.endereco.estado}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TABELA DE ITENS — área com altura fixa; itens só neste bloco; espaço restante em branco */}
      <div
        style={{
          height: ITEMS_SECTION_HEIGHT_PX,
          minHeight: ITEMS_SECTION_HEIGHT_PX,
          maxHeight: ITEMS_SECTION_HEIGHT_PX,
          overflow: 'hidden',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
          }}
        >
          <thead>
            <tr>
              <th style={{ padding: '12px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px 0 0 0', width: '40px' }}>
                #
              </th>
              <th style={{ padding: '12px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Descrição
              </th>
              <th style={{ padding: '12px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '60px' }}>
                Qtd
              </th>
              <th style={{ padding: '12px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'right', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '100px' }}>
                Unitário
              </th>
              <th style={{ padding: '12px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'right', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0 6px 0 0', width: '110px' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, index: number) => (
              <tr key={item.id}>
                <td style={{ padding: '12px 10px', textAlign: 'center', color: '#6B7280', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>
                  {index + 1}
                </td>
                <td style={{ padding: '12px 10px', color: '#1F2937', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>
                  {item.descricao}
                  <span style={{ color: '#9CA3AF', fontSize: '12px', marginLeft: '6px' }}>({item.unidade})</span>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', color: '#1F2937', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                  {item.quantidade}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#4B5563', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {formatCurrency(item.valor_unitario)}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '600', color: '#1F2937', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* TOTAIS + OBSERVACOES */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* OBSERVACOES */}
        <div style={{ flex: 1 }}>
          {quote.observacoes && (
            <div
              style={{
                padding: '16px 20px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                height: '100%',
              }}
            >
              <p style={{ margin: '0 0 8px', color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
                Condições e Observações
              </p>
              <p style={{ margin: 0, color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {quote.observacoes}
              </p>
            </div>
          )}
        </div>

        {/* TOTAIS */}
        <div style={{ width: '240px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ color: '#6B7280', fontSize: '14px' }}>Subtotal</span>
            <span style={{ color: '#1F2937', fontSize: '14px', fontWeight: '500' }}>{formatCurrency(quote.subtotal)}</span>
          </div>

          {quote.desconto_valor > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E5E7EB' }}>
              <span style={{ color: '#6B7280', fontSize: '14px' }}>
                Desconto {quote.desconto_tipo === 'percentual' && `(${quote.desconto_valor}%)`}
              </span>
              <span style={{ color: '#6B7280', fontSize: '14px' }}>- {formatCurrency(descontoCalculado)}</span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              marginTop: '12px',
              backgroundColor: '#1F2937',
              borderRadius: '8px',
            }}
          >
            <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>TOTAL</span>
            <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>
              {formatCurrency(quote.total)}
            </span>
          </div>
        </div>
      </div>

      {/* ASSINATURAS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '60px',
          paddingTop: '32px',
          marginTop: '12px',
        }}
      >
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '10px' }}>
            <p style={{ margin: 0, color: '#1F2937', fontSize: '14px', fontWeight: '600' }}>{company.nome}</p>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '12px' }}>Responsável</p>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ borderTop: '2px solid #374151', paddingTop: '10px' }}>
            <p style={{ margin: 0, color: '#1F2937', fontSize: '14px', fontWeight: '600' }}>{quote.cliente.nome}</p>
            <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '12px' }}>Cliente</p>
          </div>
        </div>
      </div>

      {/* RODAPE */}
      <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '12px' }}>
          Este orçamento tem validade até {formatDate(quote.data_validade)}. Valores sujeitos a alteração após este período.
        </p>
      </div>
      </div>
    </div>
  );
}

export async function generateQuotePDF(quote: Quote): Promise<void> {
  const company = useStore.getState().company;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  document.body.appendChild(container);

  const { createRoot } = await import('react-dom/client');
  const root = createRoot(container);

  // Normaliza o campo de itens antes de renderizar (pode vir como `items` do DB)
  const normalizedItems = Array.isArray((quote as any).itens)
    ? (quote as any).itens
    : Array.isArray((quote as any).items)
    ? (quote as any).items
    : [];

  const normalizedQuote = { ...quote, itens: normalizedItems };

  root.render(<QuotePDFTemplate quote={normalizedQuote as Quote} company={company} />);

  await new Promise((resolve) => setTimeout(resolve, 100));

  const element = container.querySelector('#quote-pdf-page') as HTMLElement | null;

  if (!element) {
    document.body.removeChild(container);
    throw new Error('Template not found');
  }

  const clienteName = (quote.cliente?.nome ?? '').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Orcamento_${getQuoteDisplayNumber(quote)}_${clienteName}.pdf`;

  // jsPDF: uma única página A4 (210mm x 297mm), sem segunda página
  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 5;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - 2 * MARGIN_MM;
  const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - 2 * MARGIN_MM;

  const canvas = await html2canvas(element, {
    scale: 3,
    useCORS: true,
    logging: false,
  });

  const imgW = canvas.width;
  const imgH = canvas.height;
  const imgWmm = (imgW / 96) * 25.4;
  const imgHmm = (imgH / 96) * 25.4;
  const scale = Math.min(CONTENT_WIDTH_MM / imgWmm, CONTENT_HEIGHT_MM / imgHmm, 1);
  const w = imgWmm * scale;
  const h = imgHmm * scale;
  const x = MARGIN_MM + (CONTENT_WIDTH_MM - w) / 2;
  const y = MARGIN_MM + (CONTENT_HEIGHT_MM - h) / 2;

  const pdf = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.98);
  pdf.addImage(imgData, 'JPEG', x, y, w, h);
  pdf.save(filename);

  root.unmount();
  document.body.removeChild(container);
}
