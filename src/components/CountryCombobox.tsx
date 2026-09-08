import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';

type Props = { value?: string; onChange: (value: string) => void; placeholder?: string; name?: string; id?: string };

export function CountryCombobox({ value = '', onChange, placeholder = 'Choose country', name, id }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => COUNTRIES.filter(c => c.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown); return () => document.removeEventListener('mousedown', onDown);
  }, []);
  useEffect(() => setActive(0), [query]);
  function key(e: React.KeyboardEvent) {
    if (!open && (e.key === 'Enter' || e.key === 'ArrowDown')) { e.preventDefault(); setOpen(true); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); onChange(filtered[active]); setOpen(false); setQuery(''); }
    if (e.key === 'Escape') setOpen(false);
  }
  return <div ref={ref} className="relative" id={id}>
    {name && <input type="hidden" name={name} value={value} />}
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)} onKeyDown={key} className="input-field w-full flex items-center justify-between text-left">
      <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{value || placeholder}</span><ChevronDown size={16} />
    </button>
    {open && <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background shadow-xl p-2">
      <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={key} placeholder="Search countries…" aria-label="Search countries" className="input-field w-full mb-2" />
      <div role="listbox" className="max-h-64 overflow-auto">
        {filtered.length ? filtered.map((country, i) => <button type="button" role="option" aria-selected={country === value} key={country} onMouseEnter={() => setActive(i)} onClick={() => { onChange(country); setOpen(false); setQuery(''); }} className={`w-full px-3 py-2 rounded text-sm text-left flex items-center justify-between ${i === active ? 'bg-accent' : 'hover:bg-accent/60'}`}>
          {country}{country === value && <Check size={15} />}
        </button>) : <p className="p-3 text-sm text-muted-foreground">No country found.</p>}
      </div>
    </div>}
  </div>;
}
