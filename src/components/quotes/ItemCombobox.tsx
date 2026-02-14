import { useState, useRef, useEffect } from 'react';
import { Input } from '../ui/input';
import { formatCurrency } from '../../lib/utils';
import type { ItemCatalogDB } from '../../lib/supabase';
import { cn } from '../../lib/utils';

interface ItemComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onSelectFromCatalog: (descricao: string, unitPrice: number, unit: string) => void;
  catalogItems: ItemCatalogDB[];
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
}

export function ItemCombobox({
  value,
  onChange,
  onSelectFromCatalog,
  catalogItems,
  placeholder = 'Digite ou selecione um item do catálogo',
  error,
  disabled,
}: ItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = (value ?? '').trim().toLowerCase();
  const items = catalogItems ?? [];
  const filtered =
    search.length === 0
      ? items.slice(0, 8)
      : items.filter((item) => {
          if (!item) return false;
          const name = (item?.name ?? '').toLowerCase();
          const description = (item?.description ?? '').toLowerCase();
          return name.includes(search) || description.includes(search);
        });

  useEffect(() => {
    setHighlightIndex(0);
  }, [value, filtered.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: ItemCatalogDB) => {
    const descricao = item.description ? `${item.name} - ${item.description}` : item.name;
    onChange(descricao);
    onSelectFromCatalog(descricao, Number(item.unit_price), item.unit_type);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500" role="option">
              Nenhum item no catálogo. Digite manualmente.
            </li>
          ) : (
            filtered.map((item, index) => {
              const desc = item.description ? `${item.name} - ${item.description}` : item.name;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={index === highlightIndex}
                  className={cn(
                    'cursor-pointer px-3 py-2 text-sm flex items-center justify-between gap-2',
                    index === highlightIndex ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-50'
                  )}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                >
                  <span className="truncate">{desc}</span>
                  <span className="shrink-0 text-primary font-medium">
                    {formatCurrency(Number(item.unit_price))} / {item.unit_type}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
