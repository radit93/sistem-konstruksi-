<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PipeSchedule extends Model
{
    protected $fillable = [
        'nominal_size',
        'nps_mm',
        'od_mm',
        'schedule',
        'wall_mm',
        'weight_kg_m',
    ];

    /**
     * Ambil ukuran nominal dari teks bebas: '4"', '4 inch', '4"-8"' -> '4'.
     */
    public static function normalizeSize(?string $size): ?string
    {
        $size = trim((string) $size);

        if ($size === '') {
            return null;
        }

        if (preg_match('/^(\d+(?:\s+\d+\/\d+)?|\d+\/\d+)/', $size, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }

    /**
     * Normalkan schedule: 'SCH40', 'Sch. 40', '40' -> 'Sch 40'; STD/XS/XXS tetap.
     */
    public static function normalizeSchedule(?string $schedule): ?string
    {
        $value = strtoupper(trim((string) $schedule));

        if ($value === '') {
            return null;
        }

        if (preg_match('/^(?:SCH\.?\s*)?(\d{2,3})$/', $value, $matches)) {
            return 'Sch '.$matches[1];
        }

        if (in_array($value, ['STD', 'XS', 'XXS'], true)) {
            return $value;
        }

        return null;
    }

    public static function lookup(?string $size, ?string $schedule): ?self
    {
        $size = self::normalizeSize($size);
        $schedule = self::normalizeSchedule($schedule);

        if (! $size || ! $schedule) {
            return null;
        }

        return self::query()
            ->where('nominal_size', $size)
            ->where('schedule', $schedule)
            ->first();
    }

    /**
     * Lengkapi data BOM pipa dengan OD, wall thickness, dan berat dari master.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function enrichBom(array $data): array
    {
        $component = strtolower((string) ($data['component_type'] ?? ''));

        if (! str_contains($component, 'pipe')) {
            return $data;
        }

        $schedule = self::lookup(
            $data['size'] ?? null,
            $data['rating_sch'] ?? ($data['schedule_rating'] ?? null)
        );

        if (! $schedule) {
            return $data;
        }

        $data['od_mm'] = $schedule->od_mm;
        $data['wall_mm'] = $schedule->wall_mm;
        $data['weight_kg'] = round(((float) ($data['qty'] ?? 0)) * (float) $schedule->weight_kg_m, 2);

        return $data;
    }
}
