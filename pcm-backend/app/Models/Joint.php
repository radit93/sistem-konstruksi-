<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Joint extends Model
{
    protected $fillable = [
        'drawing_no', 'line_no', 'spool_no', 'seq', 'item_a', 'spec_a', 'item_b', 'spec_b',
        'size_in', 'shop_field', 'joint_type', 'method', 'wps', 'welder', 'fit_date', 'weld_date',
        'visual', 'status', 'department_id',
        // Checklist konstruksi (fit-up QC & parameter pengelasan)
        'fitup_alignment', 'fitup_root_gap', 'fitup_bevel', 'fitup_hi_low', 'fitup_tack_weld',
        'fitup_inspector', 'fitup_inspection_date', 'welding_process', 'filler_material',
        'preheat', 'interpass_temperature', 'construction_remarks',
        // Repair tracking
        'repair_no', 'repair_defect', 'repair_method', 'repair_welder', 'repair_date', 'repair_status', 'repair_remarks',
    ];

    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }
}
