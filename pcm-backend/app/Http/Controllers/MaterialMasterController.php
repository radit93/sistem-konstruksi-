<?php
namespace App\Http\Controllers;
use App\Models\MaterialCategory;
use App\Models\MaterialLocation;
use App\Models\MaterialUnit;
use App\Models\MaterialVendor;
use Illuminate\Http\Request;

class MaterialMasterController extends Controller
{
    private array $map = ['vendors' => MaterialVendor::class, 'categories' => MaterialCategory::class, 'units' => MaterialUnit::class, 'locations' => MaterialLocation::class];
    public function index(Request $request, string $type) { abort_unless(isset($this->map[$type]), 404); abort_unless($request->user()->hasPermission('stock.view'), 403); return response()->json($this->map[$type]::where('is_active', true)->orderBy('name')->get()); }
    public function store(Request $request, string $type) { abort_unless(isset($this->map[$type]), 404); abort_unless($request->user()->hasPermission('stock.write'), 403); $rules = match ($type) { 'vendors' => ['code'=>'required|string|max:32|unique:material_vendors,code','name'=>'required|string|max:160'], 'categories' => ['code'=>'required|string|max:32|unique:material_categories,code','name'=>'required|string|max:100','default_unit'=>'required|string|max:32'], 'units' => ['code'=>'required|string|max:16|unique:material_units,code','name'=>'required|string|max:64','decimal_precision'=>'nullable|integer|min:0|max:6'], 'locations' => ['code'=>'required|string|max:64|unique:material_locations,code','name'=>'required|string|max:128','storage_type'=>'required|in:WAREHOUSE,OPEN_YARD,QUARANTINE,SCRAP'], }; return response()->json($this->map[$type]::create($request->validate($rules)), 201); }
}
