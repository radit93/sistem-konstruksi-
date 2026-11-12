<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialReturn extends Model
{
    protected $fillable = [
        'project_id', 'material_issuing_id', 'material_storing_id', 'return_no',
        'qty', 'unit', 'condition', 'reason', 'status', 'department_id', 'created_by',
    ];

    protected function casts(): array
    {
        return ['qty' => 'decimal:2'];
    }

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function issuing(): BelongsTo { return $this->belongsTo(MaterialIssuing::class, 'material_issuing_id'); }
    public function storing(): BelongsTo { return $this->belongsTo(MaterialStoring::class, 'material_storing_id'); }
}
