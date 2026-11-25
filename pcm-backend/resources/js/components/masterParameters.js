/* -------------------------------------------------------------------------
 * Master parameter bersama
 *
 * Plant Area dikelola superadmin di Administrasi → Master Parameter
 * (tabel system_parameters, kategori plant_area). Helper ini adalah satu-
 * satunya tempat daftar opsi itu dibentuk, supaya form Isometric Drawing di
 * Engineering dan form Safe man-hours di HSE tidak pernah berbeda daftar.
 * ---------------------------------------------------------------------- */

export function buildPlantAreaOptions(systemParameters = [], extras = []) {
    const options = (systemParameters || [])
        .filter((param) => param.category === 'plant_area' && param.is_active !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((param) => ({
            value: param.name,
            label: param.description ? `${param.name} — ${param.description}` : param.name,
            code: param.code || '',
        }));

    const known = new Set(options.map((option) => option.value));

    /* Nilai tambahan dipakai modul yang sudah punya data lama di luar master
       (mis. man-hours yang dibuat sebelum dropdown ini ada). Data lama tetap
       bisa dipilih supaya tidak hilang saat diedit. */
    (extras || []).forEach((extra) => {
        const item = typeof extra === 'string'
            ? { value: extra, label: `${extra} (data lama)` }
            : extra;
        const value = String(item?.value ?? '').trim();
        if (!value || known.has(value)) return;
        known.add(value);
        options.push({
            value,
            label: item.label || value,
            code: item.code || '',
        });
    });

    return options;
}
