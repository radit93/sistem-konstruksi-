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
    placeholder = 'Cari...',
    disabled = false,
    allowCustom = false,
    className = '',
    emptyText = 'Tidak ada pilihan.',
    ariaLabel,
}) {
    const list = useMemo(() => normalizeOptions(options), [options]);
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
        const width = Math.min(r.width, window.innerWidth - 16);
        const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
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
                type="text"
                className="form-control form-control-sm pcm-searchselect__input"
                value={open ? query : selectedLabel}
                placeholder={placeholder}
                disabled={disabled}
                role="combobox"
                aria-label={ariaLabel || placeholder}
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                autoComplete="off"
                onFocus={openMenu}
                onClick={openMenu}
                onChange={(event) => {
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
