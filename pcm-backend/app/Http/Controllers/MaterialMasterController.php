<?php

namespace App\Http\Controllers;

use App\Models\MaterialStandard;
use App\Models\SystemParameter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialMasterController extends Controller
{
    public function index(Request $request, string $type): JsonResponse
    {
        abort_unless(in_array($type, ['categories', 'units'], true), 404);
        abort_unless($request->user()->hasPermission('stock.view'), 403);

        if ($type === 'categories') {
            $values = MaterialStandard::query()
                ->whereNotNull('category')
                ->select('category')
                ->distinct()
                ->orderBy('category')
                ->get()
                ->map(fn (MaterialStandard $standard): array => [
                    'code' => strtoupper($standard->category),
                    'name' => $standard->category,
                ])
                ->values();
        } else {
            $values = SystemParameter::query()
                ->where('category', 'material_unit')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'code', 'name']);
        }

        return response()->json($values);
    }
}
