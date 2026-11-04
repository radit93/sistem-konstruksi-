<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Services\AutoBomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BomGenerationController extends Controller
{
    public function __construct(private readonly AutoBomService $autoBom) {}

    /**
     * Generate BOM/MTO draft dari isometrik drawing dan piping class.
     */
    public function store(Request $request, Drawing $drawing): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('drawing.write'),
            403,
            'Akses ditolak: butuh izin drawing.write'
        );

        $items = $this->autoBom->generateForDrawing($drawing);
        $items->each(fn ($item) => $item->load(['materialStandard', 'drawing']));

        return response()->json([
            'message' => sprintf(
                'BOM berhasil digenerate otomatis dari piping class %s (%d item).',
                $this->autoBom->resolvePipingClass($drawing),
                $items->count()
            ),
            'piping_class' => $this->autoBom->resolvePipingClass($drawing),
            'count' => $items->count(),
            'items' => $items,
        ]);
    }
}
