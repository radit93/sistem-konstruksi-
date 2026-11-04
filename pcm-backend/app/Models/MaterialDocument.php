<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class MaterialDocument extends Model
{
    public const CATEGORY_LABELS = [
        'PACKING_LIST' => 'Packing List',
        'MTC' => 'Mill Test Certificate',
        'BAP' => 'Berita Acara Penerimaan',
        'ISSUING_SLIP' => 'Bukti Pengeluaran',
        'REQUEST' => 'Surat Permintaan',
        'MAPPING' => 'Denah Lokasi',
        'LAYOUT' => 'Layout Penyimpanan',
        'PHOTO' => 'Foto Material',
        'OTHER' => 'Dokumen Lain',
    ];

    protected $fillable = [
        'project_id',
        'department_id',
        'documentable_type',
        'documentable_id',
        'category',
        'file_path',
        'original_name',
        'mime_type',
        'file_size',
        'uploaded_by',
        'notes',
    ];

    protected $hidden = [
        'file_path',
    ];

    protected $appends = [
        'download_url',
        'category_label',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::deleting(function (MaterialDocument $document): void {
            Storage::disk('local')->delete($document->getRawOriginal('file_path'));
        });
    }

    public function documentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getDownloadUrlAttribute(): string
    {
        return '/api/material-documents/'.$this->id.'/download';
    }

    public function getCategoryLabelAttribute(): string
    {
        return self::CATEGORY_LABELS[$this->category] ?? $this->category;
    }
}
