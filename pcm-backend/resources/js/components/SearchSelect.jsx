import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Dropdown dengan kotak pencarian.
 *
 * Dipakai untuk memilih data master (NPS, schedule, material) karena
 * <select> bawaan tidak bisa difilter ketika daftarnya panjang.
 * allowCustom=true membuat nilai yang diketik tetap bisa dipakai walau
 * belum ada di master (masa transisi sebelum tabel perusahaan diimpor).
 */
function normalizeOptions(options) {
    return (options || [])
        .map((opt) => {
            if (opt === null || opt === undefined) return null;
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: String(opt), label: String(opt), hint: '' };
            }
            const value = opt.value ?? opt.label ?? '';
            return {
                value: String(value),
                label: String(opt.label ?? value),
                hint: opt.hint ? String(opt.hint) : '',
            };
        })
        .filter(Boolean);
}

export function SearchSelect({
    value = '',
    onChange,
    options = [],
    placeholder = 'Pilih...',
    disabled = false,
    className = '',
    ariaLabel,
    inputId,
    required = false,
    allowCustom = false,
    emptyText = 'Tidak ada pilihan yang cocok',
    children,
    searchable = true,
    menuAlign = 'left',
    menuWidth,
}) {
    const list = useMemo(() => {
        /* Dukungan <option> anak: memudahkan pemakaian sebagai pengganti
           <select> biasa tanpa harus menyusun array options. */
        const kids = React.Children.toArray(children)
            .filter((child) => React.isValidElement(child) && child.type === 'option');
        if (kids.length > 0) {
            return kids.map((child) => ({
                value: String(child.props.value ?? ''),
                label: String(child.props.children ?? child.props.value ?? ''),
                hint: ''
            }));
        }
        return normalizeOptions(options);
    }, [children, options]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const [rect, setRect] = useState(null);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const menuRef = useRef(null);
    const listId = useId();

    const selectedLabel = useMemo(() => {
        const found = list.find((opt) => opt.value === String(value ?? ''));
        return found ? found.label : String(value ?? '');
    }, [list, value]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q || q === selectedLabel.toLowerCase()) return list;
        return list.filter((opt) =>
            opt.label.toLowerCase().includes(q)
            || opt.value.toLowerCase().includes(q)
            || opt.hint.toLowerCase().includes(q)
        );
    }, [list, query, selectedLabel]);

    useEffect(() => {
        if (!open || document.activeElement !== inputRef.current) {
            setQuery(selectedLabel);
        }
    }, [selectedLabel, open]);

    useEffect(() => {
        if (highlight >= filtered.length) setHighlight(0);
    }, [filtered.length, highlight]);

    const positionMenu = () => {
        const el = inputRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const spaceBelow = window.innerHeight - r.bottom;
        const openUp = spaceBelow < 220 && r.top > 220;
        const targetWidth = menuWidth ? Number(menuWidth) : r.width;
        const width = Math.min(targetWidth, window.innerWidth - 16);
        let left = r.left;
        if (menuAlign === 'right') {
            left = r.right - width;
        }
        left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
        setRect({
            left,
            width,
            top: openUp ? undefined : r.bottom + 4,
            bottom: openUp ? window.innerHeight - r.top + 4 : undefined,
        });
    };

    useEffect(() => {
        if (!open) return undefined;
        positionMenu();
        const onMove = () => positionMenu();
        window.addEventListener('scroll', onMove, true);
        window.addEventListener('resize', onMove);
        return () => {
            window.removeEventListener('scroll', onMove, true);
            window.removeEventListener('resize', onMove);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onDocDown = (event) => {
            if (wrapRef.current?.contains(event.target)) return;
            if (menuRef.current?.contains(event.target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDocDown);
        return () => document.removeEventListener('mousedown', onDocDown);
    }, [open]);

    const openMenu = () => {
        if (disabled) return;
        setQuery(selectedLabel);
        setHighlight(0);
        setOpen(true);
    };

    const commit = (next) => {
        onChange?.(next);
        setQuery(String(next ?? ''));
        setOpen(false);
    };

    const commitTyped = () => {
        const text = query.trim();
        if (text === selectedLabel) return;
        onChange?.(text);
    };

    const handleKeyDown = (event) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            if (!open) openMenu();
            else setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) return;
            setHighlight((i) => Math.max(i - 1, 0));
            return;
        }
        if (event.key === 'Enter') {
            if (open && filtered[highlight]) {
                event.preventDefault();
                commit(filtered[highlight].value);
            } else if (allowCustom && query.trim()) {
                event.preventDefault();
                commit(query.trim());
            }
            return;
        }
        if (event.key === 'Escape') {
            if (!open) return;
            event.preventDefault();
            setOpen(false);
            setQuery(selectedLabel);
            return;
        }
        if (event.key === 'Tab') {
            setOpen(false);
        }
    };

    return (
        <div className={`pcm-searchselect ${className}`.trim()} ref={wrapRef}>
            <input
                ref={inputRef}
                id={inputId}
                required={required}
                type="text"
                readOnly={!searchable}
                className="form-control form-control-sm pcm-searchselect__input"
                style={!searchable ? { cursor: 'pointer', userSelect: 'none' } : undefined}
                value={open ? (searchable ? query : selectedLabel) : selectedLabel}
                placeholder={placeholder}
                disabled={disabled}
                role="combobox"
                aria-label={ariaLabel || placeholder}
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete={searchable ? 'list' : 'none'}
                autoComplete="off"
                onFocus={openMenu}
                onClick={openMenu}
                onChange={(event) => {
                    if (!searchable) return;
                    setQuery(event.target.value);
                    setOpen(true);
                    setHighlight(0);
                }}
                onBlur={() => {
                    window.setTimeout(() => {
                        if (menuRef.current?.contains(document.activeElement)) return;
                        if (allowCustom) commitTyped();
                        else setQuery(selectedLabel);
                        setOpen(false);
                    }, 0);
                }}
                onKeyDown={handleKeyDown}
            />
            {value ? (
                <button
                    type="button"
                    className="pcm-searchselect__clear"
                    aria-label="Kosongkan"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        commit('');
                        inputRef.current?.focus();
                    }}
                >
                    &times;
                </button>
            ) : (
                <span className="pcm-searchselect__caret" aria-hidden="true">&#9662;</span>
            )}

            {open && rect && createPortal(
                <div
                    ref={menuRef}
                    id={listId}
                    className="pcm-searchselect__menu"
                    role="listbox"
                    style={{
                        left: rect.left,
                        width: rect.width,
                        top: rect.top,
                        bottom: rect.bottom,
                    }}
                >
                    {filtered.length === 0 ? (
                        <div
                            className={`pcm-searchselect__empty${allowCustom && query.trim() ? ' pcm-searchselect__empty--action' : ''}`}
                            onMouseDown={(event) => {
                                if (!allowCustom || !query.trim()) return;
                                event.preventDefault();
                                commit(query.trim());
                            }}
                        >
                            {allowCustom && query.trim()
                                ? `Gunakan "${query.trim()}"`
                                : emptyText}
                        </div>
                    ) : filtered.map((opt, index) => (
                        <div
                            key={`${opt.value}-${index}`}
                            role="option"
                            aria-selected={String(value) === opt.value}
                            className={`pcm-searchselect__option${index === highlight ? ' pcm-searchselect__option--active' : ''}`}
                            onMouseDown={(event) => {
                                event.preventDefault();
                                commit(opt.value);
                            }}
                            onMouseEnter={() => setHighlight(index)}
                        >
                            <span className="pcm-searchselect__label">{opt.label}</span>
                            {opt.hint && <span className="pcm-searchselect__hint">{opt.hint}</span>}
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
}

/**
 * PcmSelect — pengganti drop-in untuk <select> biasa.
 *
 * Semua dropdown lama memakai pola:
 *   <select className="form-select" value={x} onChange={(e) => setX(e.target.value)}>
 *     <option value="">Pilih...</option>
 *     ...
 *   </select>
 *
 * PcmSelect mempertahankan pola itu (anak <option> dan onChange bergaya event)
 * tetapi merender SearchSelect, sehingga tampilan & perilaku seluruh dropdown
 * di aplikasi seragam: bisa dicari, ada caret, tombol kosongkan, dan panel
 * pilihan yang konsisten.
 */
export function PcmSelect({
    value = '',
    onChange,
    children,
    placeholder,
    disabled = false,
    required = false,
    id,
    className = '',
    ariaLabel,
    emptyText,
    searchable = true,
    menuAlign = 'left',
    menuWidth,
}) {
    const { options, placeholderOption } = useMemo(() => {
        const kids = React.Children.toArray(children)
            .filter((child) => React.isValidElement(child) && child.type === 'option')
            .map((child) => ({
                value: String(child.props.value ?? ''),
                label: String(child.props.children ?? child.props.value ?? ''),
            }));
        return {
            options: kids.filter((opt) => opt.value !== ''),
            placeholderOption: kids.find((opt) => opt.value === ''),
        };
    }, [children]);

    /* onChange tetap menerima event-like agar seluruh pemanggil lama
       (e.target.value) tidak perlu diubah. */
    const handleChange = (next) => {
        onChange?.({ target: { value: next } });
    };

    return (
        <SearchSelect
            value={String(value ?? '')}
            onChange={handleChange}
            options={options}
            placeholder={placeholder || placeholderOption?.label || 'Pilih...'}
            disabled={disabled}
            className={className}
            ariaLabel={ariaLabel}
            inputId={id}
            required={required}
            emptyText={emptyText}
            searchable={searchable}
            menuAlign={menuAlign}
            menuWidth={menuWidth}
        />
    );
}
