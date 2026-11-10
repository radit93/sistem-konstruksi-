<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FittingStandard extends Model
{
    protected $fillable = [
        'item_code',
        'category',
        'fitting_type',
        'asme_standard',
        'connection',
        'nps_main',
        'dn_main_mm',
        'od_main_mm',
        'nps_secondary',
        'dn_secondary_mm',
        'od_secondary_mm',
        'dimension_primary_mm',
        'dimension_secondary_mm',
        'schedule_class',
        'wall_mm',
        'material_cs',
        'material_ss',
        'weight_cs_kg',
        'weight_ss_kg',
        'status',
        'source_reference',
    ];

    protected function casts(): array
    {
        return [
            'od_main_mm' => 'decimal:2',
            'od_secondary_mm' => 'decimal:2',
            'dimension_primary_mm' => 'decimal:2',
            'dimension_secondary_mm' => 'decimal:2',
            'wall_mm' => 'decimal:2',
            'weight_cs_kg' => 'decimal:3',
            'weight_ss_kg' => 'decimal:3',
        ];
    }

    /**
     * Bersihkan satu string NPS: '4"', '4 inch', '4", 4"', '1-1/4", 3/4"', '4"-8"' -> '4"'.
     */
    public static function cleanNps(?string $val): ?string
    {
        if ($val === null) {
            return null;
        }

        if (str_contains($val, ',')) {
            $val = trim(explode(',', $val)[0]);
        }

        // Tangani pecahan bertanda hubung seperti 1-1/4 atau 2-1/2 menjadi 1 1/4
        $val = preg_replace('/(\d+)\s*-\s*(\d+\/\d+)/', '$1 $2', $val);

        $val = trim(str_replace(['inch', 'in', '"', chr(34)], '', $val));
        $val = preg_replace('/\s+/', ' ', $val);

        // Jika berupa range seperti '4-8' atau '4 - 8' (bukan pecahan), ambil ukuran pertama
        if (preg_match('/^(\d+(?:\s+\d+\/\d+|\/\d+)?)\s*-\s*[0-9]/', $val, $m)) {
            $val = $m[1];
        }

        if (! preg_match('/^\d+(?:\s+\d+\/\d+|\/\d+)?$/', $val)) {
            return null;
        }

        return $val.'"';
    }

    /**
     * Pecah input ukuran nominal: '4"' -> ['4"', null], '6"x3"' -> ['6"', '3"'].
     *
     * @return array{0: ?string, 1: ?string}
     */
    public static function normalizeSize(?string $size): array
    {
        $size = trim((string) $size);
        if ($size === '') {
            return [null, null];
        }

        // Tangani pecahan bertanda minus seperti '1-1/2"' -> '1 1/2"'
        $size = preg_replace('/(\d+)\s*-\s*(\d+\/\d+)/', '$1 $2', $size);

        if (preg_match('/^([0-9\/\s]+(?:\x22|inch|in)?)\s*(?:[xX]|\s+to\s+)\s*([0-9\/\s]+(?:\x22|inch|in)?)/', $size, $matches)) {
            return [
                self::cleanNps($matches[1]),
                self::cleanNps($matches[2]),
            ];
        }

        return [
            self::cleanNps($size),
            null,
        ];
    }

    /**
     * Normalkan schedule / pressure rating fitting.
     * Mengembalikan bentuk baku seperti 'Sch 40', 'STD', 'XS', '3000#', 'Sch 10S'.
     */
    public static function normalizeScheduleClass(?string $schedule): ?string
    {
        $value = strtoupper(trim((string) $schedule));
        if ($value === '') {
            return null;
        }

        // Format rating forged 3000# / 6000#
        if (preg_match('/^(?:CLASS\s*)?(3000|6000)(?:#|LB|LBS)?$/', $value, $m)) {
            return $m[1].'#';
        }

        // Format stainless 10S / 40S / 80S
        if (preg_match('/^(?:SCH\.?\s*)?(\d{1,3})S$/', $value, $m)) {
            return 'Sch '.$m[1].'S';
        }

        // Format numerik biasa Sch 40 / Sch 80 / Sch 160
        if (preg_match('/^(?:SCH\.?\s*)?(\d{2,3})$/', $value, $m)) {
            return 'Sch '.$m[1];
        }

        if (in_array($value, ['STD', 'XS', 'XXS', 'SGP'], true)) {
            return $value;
        }

        return null;
    }

    /**
     * Peta padanan schedule (fallback equivalency) antara Schedule numerik dan ASME designation:
     * Sch 40 <-> STD, Sch 80 <-> XS, Sch 160 <-> XXS.
     *
     * @return array<int, string>
     */
    public static function scheduleEquivalents(?string $schedule): array
    {
        $sch = self::normalizeScheduleClass($schedule);
        if (! $sch) {
            return [];
        }

        $map = [
            'Sch 40' => ['Sch 40', 'STD'],
            'STD' => ['STD', 'Sch 40'],
            'Sch 80' => ['Sch 80', 'XS'],
            'XS' => ['XS', 'Sch 80'],
            'Sch 160' => ['Sch 160', 'XXS'],
            'XXS' => ['XXS', 'Sch 160'],
            '3000#' => ['3000#'],
            '6000#' => ['6000#'],
            'Sch 10S' => ['Sch 10S'],
            'SGP' => ['SGP'],
        ];

        return $map[$sch] ?? [$sch];
    }

    /**
     * Normalkan tipe komponen fitting ke nama fitting_type resmi di database fitting_standards.
     */
    public static function normalizeType(?string $type, ?string $description = null): ?string
    {
        $combined = strtolower(trim(($type ?? '').' '.($description ?? '')));
        if ($combined === '') {
            return null;
        }

        // 1. Elbow
        if (str_contains($combined, 'elbow') || preg_match('/\bel\b/', $combined)) {
            $isForged = str_contains($combined, 'forged') || str_contains($combined, 'sw') || str_contains($combined, 'socket') || str_contains($combined, 'thd') || str_contains($combined, 'threaded');
            if (str_contains($combined, '45')) {
                return $isForged ? 'Forged Elbow 45°' : 'Elbow 45° Long Radius (LR, R=1.5D)';
            }
            if (str_contains($combined, '180') || str_contains($combined, 'return')) {
                return str_contains($combined, 'sr') || str_contains($combined, 'short')
                    ? 'Return Elbow 180° Short Radius (SR)'
                    : 'Return Elbow 180° Long Radius (LR)';
            }
            if (str_contains($combined, 'sr') || str_contains($combined, 'short radius')) {
                return 'Elbow 90° Short Radius (SR, R=1.0D)';
            }
            if ($isForged) {
                return 'Forged Elbow 90°';
            }

            return 'Elbow 90° Long Radius (LR, R=1.5D)';
        }

        // 2. Tee
        if (str_contains($combined, 'tee')) {
            if (str_contains($combined, 'red') || str_contains($combined, 'reducing')) {
                return 'Reducing Tee (Tee Reduksi)';
            }
            if (str_contains($combined, 'forged') || str_contains($combined, '3000') || str_contains($combined, '6000')) {
                return 'Forged Tee';
            }

            return 'Equal / Straight Tee';
        }

        // 3. Reducer
        if (str_contains($combined, 'reducer') || str_contains($combined, 'redcon') || str_contains($combined, 'redecc')) {
            if (str_contains($combined, 'ecc') || str_contains($combined, 'eksentris')) {
                return 'Eccentric Reducer (Eksentris)';
            }

            return 'Concentric Reducer (Konsentris)';
        }

        // 4. Cap
        if (str_contains($combined, 'cap')) {
            if (str_contains($combined, 'forged') || str_contains($combined, '3000') || str_contains($combined, '6000')) {
                return 'Forged End Cap';
            }

            return 'Butt-Weld Ellipsoidal End Cap';
        }

        // 5. Branch Outlets (MSS-SP-97)
        if (str_contains($combined, 'weldolet') || str_contains($combined, 'weld-o-let') || str_contains($combined, 'weld o let') || preg_match('/\bwol\b/', $combined)) {
            return 'Weldolet';
        }
        if (str_contains($combined, 'sockolet') || str_contains($combined, 'sock-o-let') || preg_match('/\bsol\b/', $combined)) {
            return 'Sockolet';
        }
        if (str_contains($combined, 'threadolet') || str_contains($combined, 'thredolet') || preg_match('/\btol\b/', $combined)) {
            return 'Threadolet';
        }

        // 6. Forged Couplings & Unions
        if (str_contains($combined, 'coupling')) {
            return str_contains($combined, 'half') ? 'Half Coupling' : 'Full Coupling';
        }
        if (str_contains($combined, 'union')) {
            return 'Union (MSS-SP-83)';
        }
        if (str_contains($combined, 'cross')) {
            return 'Forged Cross';
        }

        // 7. Stub End
        if (str_contains($combined, 'stub end') || str_contains($combined, 'stub-end') || str_contains($combined, 'lap joint')) {
            return (str_contains($combined, 'short') || str_contains($combined, 'mss'))
                ? 'Lap Joint Stub End (MSS-SP-43 Short)'
                : 'Lap Joint Stub End (ASME B16.9 Long)';
        }

        return null;
    }

    /**
     * Deteksi apakah spesifikasi material merupakan Stainless Steel / Duplex.
     */
    public static function isStainless(?string $materialSpec, ?string $description = null): bool
    {
        $text = strtoupper(trim(($materialSpec ?? '').' '.($description ?? '')));

        foreach (['SS', '304', '316', 'STAINLESS', 'A403', 'WP304', 'WP316', 'F304', 'F316', 'DUPLEX', '2205', '2507', 'A182'] as $kw) {
            if (str_contains($text, $kw)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Cari baris spesifikasi fitting standar di database.
     */
    public static function lookup(?string $componentType, ?string $size, ?string $scheduleClass = null, ?string $secondarySize = null): ?self
    {
        $normalizedType = self::normalizeType($componentType);
        [$parsedMain, $parsedSecondary] = self::normalizeSize($size);

        $mainSize = $parsedMain;
        $secSize = $secondarySize ? self::cleanNps($secondarySize) : $parsedSecondary;

        if (! $normalizedType || ! $mainSize) {
            return null;
        }

        $schedules = self::scheduleEquivalents($scheduleClass);

        $query = self::query()
            ->where('fitting_type', $normalizedType)
            ->where('nps_main', $mainSize);

        if ($secSize) {
            $query->where('nps_secondary', $secSize);
        }

        if (! empty($schedules)) {
            $query->whereIn('schedule_class', $schedules);
        }

        // Utamakan schedule yang cocok persis lebih dulu
        $results = $query->get();
        if ($results->isEmpty()) {
            // Coba tanpa filter schedule jika tidak ditemukan, ambil default pertama
            return self::query()
                ->where('fitting_type', $normalizedType)
                ->where('nps_main', $mainSize)
                ->when($secSize, fn ($q) => $q->where('nps_secondary', $secSize))
                ->first();
        }

        if ($scheduleClass) {
            $normalizedSch = self::normalizeScheduleClass($scheduleClass);
            $exact = $results->firstWhere('schedule_class', $normalizedSch);
            if ($exact) {
                return $exact;
            }
        }

        return $results->first();
    }

    /**
     * Lengkapi data Bill of Material untuk fitting dengan OD, wall thickness, dan bobot dari master data.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function enrichBom(array $data): array
    {
        $component = strtolower((string) ($data['component_type'] ?? ''));

        // Jika komponen pipa, serahkan ke PipeSchedule
        if (str_contains($component, 'pipe')) {
            return $data;
        }

        // Abaikan instrumen atau valve jika bukan fitting
        if (preg_match('/\b(valve|gasket|bolt|nut|instrument|support|hanger)\b/i', $component)) {
            return $data;
        }

        $fitting = self::lookup(
            $data['component_type'] ?? null,
            $data['size'] ?? null,
            $data['rating_sch'] ?? ($data['schedule_rating'] ?? null)
        );

        if (! $fitting) {
            return $data;
        }

        $isSs = self::isStainless(
            $data['material_spec'] ?? null,
            $data['description'] ?? null
        );

        // Pilih berat satuan: gunakan SS jika stainless, jika tidak gunakan CS
        $unitWeight = $isSs ? (float) ($fitting->weight_ss_kg ?: $fitting->weight_cs_kg) : (float) ($fitting->weight_cs_kg ?: $fitting->weight_ss_kg);

        if ($fitting->od_main_mm && empty($data['od_mm'])) {
            $data['od_mm'] = $fitting->od_main_mm;
        }

        if ($fitting->wall_mm && empty($data['wall_mm'])) {
            $data['wall_mm'] = $fitting->wall_mm;
        }

        $qty = (float) ($data['qty'] ?? 1);
        if ($unitWeight > 0) {
            $data['weight_kg'] = round($qty * $unitWeight, 2);
        }

        return $data;
    }
}
