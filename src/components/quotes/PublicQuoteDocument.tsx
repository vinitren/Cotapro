/**
 * Cópia visual do QuotePDFTemplate para a página pública.
 * NÃO modificar QuotePDFTemplate - este componente é independente.
 * Mesma aparência do PDF, adaptado para web (height: auto, sem assinaturas).
 */
import type { Quote, Company } from '../../types';
import { formatCurrency, formatDate, getQuoteDisplayNumber } from '../../lib/utils';

interface PublicQuoteDocumentProps {
  quote: Quote;
  company: Company;
}

export function PublicQuoteDocument({ quote, company }: PublicQuoteDocumentProps) {
  const descontoCalculado =
    quote.desconto_tipo === 'percentual'
      ? (quote.subtotal * quote.desconto_valor) / 100
      : quote.desconto_valor;

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

  const isCompactMode = items.length >= 6;

  const PDF_PAGE_WIDTH_PX = 800;
  const HEADER_BLOCK_HEIGHT_PX = 120;
  const FOOTER_HEIGHT_PX = 180;
  const TEMPLATE_HEIGHT_PX = 1120;

  return (
    <div
      id="quote-document"
      style={{
        width: PDF_PAGE_WIDTH_PX,
        minWidth: PDF_PAGE_WIDTH_PX,
        maxWidth: PDF_PAGE_WIDTH_PX,
        marginLeft: 'auto',
        marginRight: 'auto',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
      }}
    >
      <div
        style={{
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '15px 20px',
          width: PDF_PAGE_WIDTH_PX,
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#1F2937',
          fontSize: '14px',
          lineHeight: '1.3',
          display: 'flex',
          flexDirection: 'column',
          height: TEMPLATE_HEIGHT_PX,
          minHeight: TEMPLATE_HEIGHT_PX,
        }}
      >
        {/* HEADER - altura fixa (igual ao PDF) */}
        <div
          style={{
            height: HEADER_BLOCK_HEIGHT_PX,
            minHeight: HEADER_BLOCK_HEIGHT_PX,
            maxHeight: HEADER_BLOCK_HEIGHT_PX,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            marginBottom: '12px',
            borderBottom: '3px solid #1F2937',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {company.logo_url && (
              <img
                src={company.logo_url}
                alt="Logo"
                style={{ maxHeight: '70px', maxWidth: '140px', objectFit: 'contain' }}
              />
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#1F2937' }}>
                {company.nome}
              </h1>
              <p style={{ margin: '2px 0 0', color: '#6B7280', fontSize: '12px', lineHeight: '1.3' }}>
                CNPJ: {company.cnpj} | Tel: {company.telefone}
              </p>
              <p style={{ margin: '1px 0 0', color: '#6B7280', fontSize: '12px', lineHeight: '1.3' }}>
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
            <div style={{ marginTop: '6px' }}>
              <p style={{ margin: 0, color: '#4B5563', fontSize: '13px' }}>
                <strong>Emissão:</strong> {formatDate(quote.data_emissao)}
              </p>
              <p style={{ margin: '2px 0 0', color: '#4B5563', fontSize: '13px' }}>
                <strong>Validade:</strong> {formatDate(quote.data_validade)}
              </p>
            </div>
          </div>
        </div>

        {/* CLIENTE - entre header e tabela (igual ao PDF) */}
        <div
          style={{
            marginTop: '12px',
            marginBottom: '15px',
            padding: '10px 15px',
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
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
                {quote.cliente.nome}
              </p>
              <p style={{ margin: '2px 0 0', color: '#4B5563', fontSize: '13px' }}>
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

        {/* ÁREA DE ITENS - flex: 1, minHeight: 0 (igual ao PDF) */}
        <div style={{ flex: 1, minHeight: 0, marginBottom: '15px', backgroundColor: '#ffffff' }}>
          <table
            style={{
              width: '100%',
              height: 'auto',
              tableLayout: 'fixed',
              borderCollapse: 'collapse',
              fontSize: '14px',
            }}
          >
            <thead>
              <tr>
                <th style={{ padding: '10px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '6px 0 0 0', width: '8%' }}>
                  #
                </th>
                <th style={{ padding: '10px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'left', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '44%' }}>
                  Descrição
                </th>
                <th style={{ padding: '10px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '12%' }}>
                  Qtd
                </th>
                <th style={{ padding: '10px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'right', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', width: '18%' }}>
                  Unitário
                </th>
                <th style={{ padding: '10px 10px', backgroundColor: '#1F2937', color: '#ffffff', textAlign: 'right', fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '0 6px 0 0', width: '18%' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, index: number) => {
                const raw = (item.descricao ?? '').toString();
                const parts = raw.split(' - ');
                const nome = (parts[0] ?? '').trim();
                const descricaoExtra = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
                const descCellStyle: React.CSSProperties = {
                  padding: '8px 10px',
                  color: '#1F2937',
                  backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  fontWeight: '500',
                  wordBreak: 'break-word',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: isCompactMode ? 1 : 2,
                  overflow: 'hidden',
                };
                return (
                  <tr key={item.id}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#6B7280', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: '500' }}>
                      {index + 1}
                    </td>
                    <td style={descCellStyle}>
                      {isCompactMode ? nome : (descricaoExtra ? `${nome} - ${descricaoExtra}` : nome)}
                      <span style={{ color: '#9CA3AF', fontSize: '12px', marginLeft: '6px' }}>({item.unidade})</span>
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', color: '#1F2937', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontWeight: '600' }}>
                      {item.quantidade}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4B5563', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {formatCurrency(item.valor_unitario)}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600', color: '#1F2937', backgroundColor: index % 2 === 0 ? '#ffffff' : '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {formatCurrency(item.subtotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER - altura fixa 180px (igual ao PDF) */}
        <div
          style={{
            height: FOOTER_HEIGHT_PX,
            minHeight: FOOTER_HEIGHT_PX,
            maxHeight: FOOTER_HEIGHT_PX,
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1 }}>
              {quote.observacoes && (
                <div
                  style={{
                    padding: '12px 15px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    height: '100%',
                  }}
                >
                  <p style={{ margin: '0 0 6px', color: '#6B7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '600' }}>
                    Condições e Observações
                  </p>
                  <p style={{ margin: 0, color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {quote.observacoes}
                  </p>
                </div>
              )}
            </div>

            <div style={{ width: '240px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E7EB' }}>
                <span style={{ color: '#6B7280', fontSize: '14px' }}>Subtotal</span>
                <span style={{ color: '#1F2937', fontSize: '14px', fontWeight: '500' }}>{formatCurrency(quote.subtotal)}</span>
              </div>

              {quote.desconto_valor > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #E5E7EB' }}>
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
                  padding: '12px 15px',
                  marginTop: '10px',
                  backgroundColor: '#1F2937',
                  borderRadius: '8px',
                }}
              >
                <span style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600', whiteSpace: 'nowrap' }}>TOTAL</span>
                <span style={{ color: '#ffffff', fontSize: '24px', fontWeight: '700', letterSpacing: '-0.02em' }}>
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #E5E7EB', textAlign: 'center', flexShrink: 0 }}>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '12px' }}>
              Este orçamento tem validade até {formatDate(quote.data_validade)}. Valores sujeitos a alteração após este período.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
