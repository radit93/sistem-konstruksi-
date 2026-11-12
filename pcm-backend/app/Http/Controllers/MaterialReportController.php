<?php

namespace App\Http\Controllers;

use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStoring;
use App\Models\Project;
use App\Services\MaterialReportService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaterialReportController extends Controller
{
    public function __construct(private readonly MaterialReportService $reports) {}

    public function receiving(Request $request): JsonResponse
    {
        $filters = $this->filters($request, [
            'status' => ['nullable', 'in:ALL,RECEIVED,REQUESTED,INSPECTED,ACCEPTED,HOLD,REJECTED'],
        ]);

        return response()->json($this->reports->receiving(
            $this->scope($request, MaterialReceiving::query()),
            $filters,
            $request->user(),
            $this->project($filters)
        ));
    }

    public function issuing(Request $request): JsonResponse
    {
        $filters = $this->filters($request, [
            'status' => ['nullable', 'in:ALL,ISSUED,CANCELLED'],
        ]);

        return response()->json($this->reports->issuing(
            $this->scope($request, MaterialIssuing::query()),
            $filters,
            $request->user(),
            $this->project($filters)
        ));
    }

    public function stockList(Request $request): JsonResponse
    {
        $filters = $this->filters($request, [
            'storage_type' => ['nullable', 'in:ALL,OPEN_YARD,WAREHOUSE'],
            'category' => ['nullable', 'string', 'max:64'],
            'stock_status' => ['nullable', 'in:ALL,LOW,OUT,NORMAL'],
            'location' => ['nullable', 'string', 'max:128'],
        ]);

        return response()->json($this->reports->stockList(
            $this->scope($request, MaterialStoring::query()),
            $filters,
            $request->user(),
            $this->project($filters)
        ));
    }

    public function locationMap(Request $request): JsonResponse
    {
        $filters = $this->filters($request, [
            'storage_type' => ['nullable', 'in:ALL,OPEN_YARD,WAREHOUSE'],
            'location' => ['nullable', 'string', 'max:128'],
        ]);

        return response()->json($this->reports->locationMap(
            $this->scope($request, MaterialStoring::query()),
            $filters,
            $request->user(),
            $this->project($filters)
        ));
    }

    /**
     * @param  array<string, array<int, string>>  $extraRules
     * @return array<string, mixed>
     */
    private function filters(Request $request, array $extraRules = []): array
    {
        $validated = $request->validate(array_merge([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'search' => ['nullable', 'string', 'max:128'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'status' => ['nullable', 'string', 'max:32'],
        ], $extraRules));

        return array_merge([
            'project_id' => null,
            'search' => null,
            'date_from' => null,
            'date_to' => null,
            'status' => 'ALL',
            'storage_type' => 'ALL',
            'category' => 'ALL',
            'stock_status' => 'ALL',
            'location' => null,
        ], $validated);
    }

    private function scope(Request $request, Builder $query): Builder
    {
        $user = $request->user();

        abort_unless(
            $user?->hasPermission('stock.view'),
            403,
            'Akses ditolak: butuh izin stock.view'
        );

        if ($user->isSuperAdmin()) {
            $department = $request->header('X-Department-Id');

            if (is_numeric($department) && (int) $department > 0) {
                $query->where($query->getModel()->getTable().'.department_id', (int) $department);
            }

            return $query;
        }

        if (! $user->department_id) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(
            $query->getModel()->getTable().'.department_id',
            $user->department_id
        );
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function project(array $filters): ?Project
    {
        if (! empty($filters['project_id'])) {
            return Project::query()->find((int) $filters['project_id']);
        }

        return null;
    }
}
