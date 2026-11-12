<?php

namespace App\Http\Controllers;

use App\Models\MaterialAdjustment;
use App\Models\MaterialIssuing;
use App\Models\MaterialReturn;
use App\Models\MaterialStoring;
use App\Services\MaterialFlowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialInventoryController extends Controller
{
    public function __construct(private readonly MaterialFlowService $flow) {}

    public function storeReturn(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.write'), 403);
        $data = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'material_issuing_id' => ['required', 'integer', 'exists:material_issuings,id'],
            'qty' => ['required', 'numeric', 'gt:0'],
            'condition' => ['required', 'in:GOOD,DAMAGED,SCRAP'],
            'reason' => ['nullable', 'string', 'max:2000'],
        ]);

        $issuing = MaterialIssuing::query()->findOrFail($data['material_issuing_id']);
        abort_unless((int) $issuing->project_id === (int) $data['project_id'], 422, 'Issuing berbeda project.');
        abort_unless($issuing->material_storing_id, 422, 'Issuing tidak terhubung ke lot stok.');

        $return = $this->flow->createReturn($issuing, $data, $request->user());
        return response()->json($return, 201);
    }

    public function storeAdjustment(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.write'), 403);
        $data = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'material_storing_id' => ['required', 'integer', 'exists:material_storings,id'],
            'qty_delta' => ['required', 'numeric', 'not_in:0'],
            'reason' => ['required', 'string', 'max:128'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);

        $stock = MaterialStoring::query()->findOrFail($data['material_storing_id']);
        abort_unless((int) $stock->project_id === (int) $data['project_id'], 422, 'Stok berbeda project.');
        $adjustment = $this->flow->requestAdjustment($stock, $data, $request->user());
        return response()->json($adjustment, 201);
    }

    public function indexReturns(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.view'), 403);
        $projectId = $request->validate(['project_id' => ['required', 'integer', 'exists:projects,id']])['project_id'];
        return response()->json(MaterialReturn::query()->with(['issuing', 'storing'])
            ->where('project_id', $projectId)->latest()->get());
    }

    public function indexAdjustments(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.view'), 403);
        $projectId = $request->validate(['project_id' => ['required', 'integer', 'exists:projects,id']])['project_id'];
        return response()->json(MaterialAdjustment::query()->with('storing')->where('project_id', $projectId)->latest()->get());
    }

    public function approveAdjustment(Request $request, MaterialAdjustment $adjustment): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.write'), 403);
        return response()->json($this->flow->approveAdjustment($adjustment, $request->user()));
    }

    public function rejectAdjustment(Request $request, MaterialAdjustment $adjustment): JsonResponse
    {
        abort_unless($request->user()->hasPermission('stock.write'), 403);
        $adjustment->update(['status' => 'REJECTED', 'approved_by' => $request->user()->id, 'approved_at' => now()]);
        return response()->json($adjustment->fresh());
    }
}
