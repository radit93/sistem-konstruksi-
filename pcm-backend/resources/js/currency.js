export const CURRENCY_CODE = 'IDR';
export const CURRENCY_LABEL = 'Rupiah';

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: CURRENCY_CODE,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

/**
 * Format a numeric value as Indonesian Rupiah, e.g. 7120000 -> "Rp 7.120.000".
 * Values arrive from the API as strings, so normalise them first.
 */
export function formatRupiah(value) {
    const amount = Number(value);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    // Intl uses a non-breaking space between "Rp" and the digits. Replace it so
    // the string behaves like ordinary text in tables and downloads.
    return rupiahFormatter.format(safeAmount).replace(/\u00A0/g, ' ');
}
