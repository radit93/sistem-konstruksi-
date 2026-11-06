import React from 'react';
import { PcmSelect } from './SearchSelect';

/**
 * Bagian bersama form Construction (FabricationTab & FieldErectionTab):
 * checklist fit-up QC, parameter pengelasan, dan repair tracking.
 *
 * Daftar namanya mengikuti migration:
 *   - 2026_11_05_070447_add_construction_checklist_fields_to_joints_table (fitup_*, welding_process, dst.)
 *   - 2026_11_05_070723_add_repair_tracking_fields_to_joints_table        (repair_*)
 */
export const constructionFieldNames = [
    'fitup_alignment',
    'fitup_root_gap',
    'fitup_bevel',
    'fitup_hi_low',
    'fitup_tack_weld',
    'fitup_inspector',
    'fitup_inspection_date',
    'welding_process',
    'filler_material',
    'preheat',
    'interpass_temperature',
    'construction_remarks',
    'repair_no',
    'repair_defect',
    'repair_method',
    'repair_welder',
    'repair_date',
    'repair_remarks'
];

/** Nilai kosong seluruh field construction, dipakai saat inisialisasi modal. */
export const emptyConstructionFields = constructionFieldNames.reduce((acc, name) => {
    acc[name] = '';
    return acc;
}, {});

/** Ambil nilai field construction dari data joint ke form modal (null dibaca ''). */
export const pickConstructionFields = (joint) => constructionFieldNames.reduce((acc, name) => {
    acc[name] = (joint?.[name] ?? '');
    return acc;
}, {});

/** NPS konsisten dengan master: "4.00" (decimal cast) -> 4", 2.5 -> 2-1/2". */
export const formatNps = (raw) => {
    if (raw === null || raw === undefined || raw === '') return '';
    const inch = Number(raw);
    if (!Number.isFinite(inch)) return String(raw);
    const whole = Math.floor(inch);
    const eighth = Math.round((inch - whole) * 8);
    if (eighth === 0) return `${whole}"`;
    if (eighth === 8) return `${whole + 1}"`;
    const marks = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'];
    return whole > 0 ? `${whole}-${marks[eighth]}"` : `${marks[eighth]}"`;
};

/** Kolom "Spec & Size": kedua spec joint + ukuran NPS format master. */
export const formatJointSpec = (j) => {
    const parts = [];
    if (j.spec_a || j.spec_b) parts.push(j.spec_a || j.spec_b);
    if (j.spec_a && j.spec_b && j.spec_a !== j.spec_b) parts.push(j.spec_b);
    const size = formatNps(j.size_in);
    if (size) parts.push(size);
    return parts.join(' · ');
};

const QC_VALUE_OPTIONS = ['OK', 'NOK', 'N/A'];
const WELDING_PROCESS_OPTIONS = ['GTAW', 'SMAW', 'GTAW + SMAW', 'FCAW', 'GMAW'];
const REPAIR_METHOD_OPTIONS = ['Grinding', 'Weld Build-up', 'Cut & Re-weld'];

function QcSelect({ label, name, value, onChange }) {
    return (
        <div>
            <label className="form-label small fw-semibold">{label}</label>
            <PcmSelect className="form-control-sm" value={value} onChange={onChange}>
                <option value="">-- Pilih --</option>
                {QC_VALUE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
            </PcmSelect>
        </div>
    );
}

/**
 * Render dua seksi form: checklist fit-up + parameter pengelasan, lalu repair
 * tracking. State-nya tetap milik pemanggil (editData / setEditData), dan
 * nama input === nama kolom di tabel joints.
 */
export function ConstructionChecklistSection({ editData, setEditData }) {
    const set = (name) => (e) => setEditData({ ...editData, [name]: e.target.value });

    return (
        <>
            <div className="border-top pt-3 mt-3">
                <span className="fw-bold text-dark d-block mb-2" style={{ fontSize: '0.82rem', letterSpacing: '.03em' }}>
                    CHECKLIST FIT-UP &amp; VISUAL QC
                </span>
                <div className="row g-2">
                    <div className="col-6 col-lg-4">
                        <QcSelect label="Alignment" name="fitup_alignment" value={editData.fitup_alignment} onChange={set('fitup_alignment')} />
                    </div>
                    <div className="col-6 col-lg-4">
                        <QcSelect label="Root Gap" name="fitup_root_gap" value={editData.fitup_root_gap} onChange={set('fitup_root_gap')} />
                    </div>
                    <div className="col-6 col-lg-4">
                        <QcSelect label="Bevel" name="fitup_bevel" value={editData.fitup_bevel} onChange={set('fitup_bevel')} />
                    </div>
                    <div className="col-6 col-lg-4">
                        <QcSelect label="Hi-Lo" name="fitup_hi_low" value={editData.fitup_hi_low} onChange={set('fitup_hi_low')} />
                    </div>
                    <div className="col-6 col-lg-4">
                        <QcSelect label="Tack Weld" name="fitup_tack_weld" value={editData.fitup_tack_weld} onChange={set('fitup_tack_weld')} />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Nama Inspector QC</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="QC-01"
                            value={editData.fitup_inspector}
                            onChange={set('fitup_inspector')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Tanggal Inspeksi QC</label>
                        <input
                            type="date"
                            className="form-control"
                            value={editData.fitup_inspection_date}
                            onChange={set('fitup_inspection_date')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Proses Pengelasan</label>
                        <PcmSelect value={editData.welding_process} onChange={set('welding_process')}>
                            <option value="">-- Pilih --</option>
                            {WELDING_PROCESS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </PcmSelect>
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Filler Material</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="ER70S-2 / E7018"
                            value={editData.filler_material}
                            onChange={set('filler_material')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Preheat (&deg;C)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="15"
                            value={editData.preheat}
                            onChange={set('preheat')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Suhu Interpass (&deg;C)</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="120"
                            value={editData.interpass_temperature}
                            onChange={set('interpass_temperature')}
                        />
                    </div>
                    <div className="col-12">
                        <label className="form-label small fw-semibold">Remarks Konstruksi</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            value={editData.construction_remarks}
                            onChange={set('construction_remarks')}
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="border-top pt-3 mt-3">
                <span className="fw-bold text-dark d-block mb-2" style={{ fontSize: '0.82rem', letterSpacing: '.03em' }}>
                    REPAIR TRACKING
                </span>
                <div className="row g-2">
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">No. Repair</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="R-001"
                            value={editData.repair_no}
                            onChange={set('repair_no')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Jenis Defect</label>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Porosity / Undercut / Crack"
                            value={editData.repair_defect}
                            onChange={set('repair_defect')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Metode Perbaikan</label>
                        <PcmSelect value={editData.repair_method} onChange={set('repair_method')}>
                            <option value="">-- Pilih --</option>
                            {REPAIR_METHOD_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                        </PcmSelect>
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Welder Repair</label>
                        <input
                            type="text"
                            className="form-control"
                            value={editData.repair_welder}
                            onChange={set('repair_welder')}
                        />
                    </div>
                    <div className="col-6 col-lg-4">
                        <label className="form-label small fw-semibold">Tanggal Repair</label>
                        <input
                            type="date"
                            className="form-control"
                            value={editData.repair_date}
                            onChange={set('repair_date')}
                        />
                    </div>
                    <div className="col-12">
                        <label className="form-label small fw-semibold">Keterangan Repair</label>
                        <textarea
                            className="form-control"
                            rows="2"
                            value={editData.repair_remarks}
                            onChange={set('repair_remarks')}
                        ></textarea>
                    </div>
                </div>
            </div>
        </>
    );
}
