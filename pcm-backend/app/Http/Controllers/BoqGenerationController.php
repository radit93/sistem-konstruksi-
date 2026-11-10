<?php

namespace App\Http\Controllers;

use App\Models\Drawing;
use App\Models\Project;
use App\Services\BoqSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoqGenerationController extends Controller
{
    public function __construct(private readonly BoqSyncService $boqSync) {}

    /**
     * Sinkronkan item BOQ Engineering dari data aktual Welding Map & Drawing.
     */
    public function sync(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()->hasPermission('drawing.write'),
            403,
            'Akses ditolak: butuh izin drawing.write'
        );

        $request->validate([
            'project_id' => 'required',
            'drawing_id' => 'nullable',
        ]);

        $projectId = (int) $request->input('project_id');
        $drawingId = $request->filled('drawing_id') ? (int) $request->input('drawing_id') : null;
        $deptId = $request->user()->department_id;

        $items = $this->boqSync->sync($projectId, $drawingId, $deptId);

        return response()->json([
            'message' => sprintf('Berhasil menyinkronkan %d item BOQ dari data Welding Map.', $items->count()),
            'count' => $items->count(),
            'items' => $items,
        ]);
    }
}
