<?php

use App\Http\Controllers\Admin\DepartmentController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BomGenerationController;
use App\Http\Controllers\CrudController;
use App\Http\Controllers\MaterialDocumentController;
use App\Http\Controllers\MaterialReportController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->name('login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Administration (SUPERADMIN). Every route carries the permission it needs;
    // superadmin passes all of them through Gate::before.
    Route::prefix('admin')->group(function () {
        Route::get('/departments', [DepartmentController::class, 'index'])->middleware('permission:department.view');
        Route::post('/departments', [DepartmentController::class, 'store'])->middleware('permission:department.create');
        Route::put('/departments/{department}', [DepartmentController::class, 'update'])->middleware('permission:department.update');
        Route::delete('/departments/{department}', [DepartmentController::class, 'destroy'])->middleware('permission:department.delete');

        Route::get('/roles', [RoleController::class, 'index'])->middleware('permission:role.view');
        Route::post('/roles', [RoleController::class, 'store'])->middleware('permission:role.create');
        Route::put('/roles/{role}', [RoleController::class, 'update'])->middleware('permission:role.update');
        Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:role.delete');

        Route::get('/users', [UserController::class, 'index'])->middleware('permission:user.view');
        Route::post('/users', [UserController::class, 'store'])->middleware('permission:user.create');
        Route::put('/users/{user}', [UserController::class, 'update'])->middleware('permission:user.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->middleware('permission:user.delete');
        Route::post('/users/{user}/password', [UserController::class, 'resetPassword'])->middleware('permission:user.reset-password');
        Route::put('/users/{user}/role', [UserController::class, 'assignRole'])->middleware('permission:role.assign');

        Route::get('/permissions', [PermissionController::class, 'index'])->middleware('permission:access.view');
        Route::get('/roles/{role}/permissions', [PermissionController::class, 'forRole'])->middleware('permission:access.view');
        Route::put('/roles/{role}/permissions', [PermissionController::class, 'sync'])->middleware('permission:access.update');
    });

    $resRegex = 'projects|drawings|joints|stock|inspections|test-packages|hse|scopes|progress|daily-progress|line-services|material-standards|fitting-standards|fitting-catalogs|pipe-standards|system-parameters|piping-class-templates|pipe-schedules|welding-maps|bill-of-materials|engineering-boqs|document-controls|project-milestones|budget-items|material-receivings|material-inspections|material-storings|material-issuings';
    Route::get('/overview', [CrudController::class, 'overview']);
    Route::get('/material-requirements', [CrudController::class, 'materialRequirements']);

    Route::prefix('material-reports')->group(function () {
        Route::get('/receiving', [MaterialReportController::class, 'receiving']);
        Route::get('/issuing', [MaterialReportController::class, 'issuing']);
        Route::get('/stock', [MaterialReportController::class, 'stockList']);
        Route::get('/location-map', [MaterialReportController::class, 'locationMap']);
    });

    Route::get('/material-documents', [MaterialDocumentController::class, 'index']);
    Route::post('/material-documents', [MaterialDocumentController::class, 'store']);
    Route::get('/material-documents/{materialDocument}/download', [MaterialDocumentController::class, 'download']);
    Route::delete('/material-documents/{materialDocument}', [MaterialDocumentController::class, 'destroy']);

    // Priority C: Auto-generate BOM/MTO dari isometrik drawing & piping class.
    Route::post('/drawings/{drawing}/generate-bom', [BomGenerationController::class, 'store']);

    Route::post('/material-receivings/{id}/request-inspection', [CrudController::class, 'requestMaterialInspection']);
    Route::post('/material-storings/{id}/transfer', [CrudController::class, 'transferMaterialStock']);
    Route::get('/fitting-standards/lookup', [CrudController::class, 'lookupFitting']);
    Route::get('/{res}', [CrudController::class, 'index'])->where('res', $resRegex);
    Route::get('/{res}/{id}', [CrudController::class, 'show'])->where('res', $resRegex);
    Route::post('/{res}', [CrudController::class, 'store'])->where('res', $resRegex);
    Route::put('/{res}/{id}', [CrudController::class, 'update'])->where('res', $resRegex);
    Route::delete('/{res}/{id}', [CrudController::class, 'destroy'])->where('res', $resRegex);
});
