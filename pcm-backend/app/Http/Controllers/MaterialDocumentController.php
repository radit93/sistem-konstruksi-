<?php

namespace App\Http\Controllers;

use App\Models\MaterialDocument;
use App\Models\MaterialIssuing;
use App\Models\MaterialReceiving;
use App\Models\MaterialStoring;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MaterialDocumentController extends Controller
{
    /**
     * Friendly names from the frontend mapped to the owning Material model.
     *
     * @var array<string, class-string<Model>>
     */
    private const SUBJECTS = [
        'receiving' => MaterialReceiving::class,
        'issuing' => MaterialIssuing::class,
        'storing' => MaterialStoring::class,
    ];

    public function index(Request $request): JsonResponse
    {
        [$subject] = $this->resolveSubject($request);
        $this->assertSubjectAccess($request, $subject, 'view');

        $query = $subject->documents()
            ->with('uploader:id,name')
            ->orderByDesc('id');

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'documentable_type' => ['required', 'string', 'in:'.implode(',', array_keys(self::SUBJECTS))],
            'documentable_id' => ['required', 'integer', 'min:1'],
            'category' => ['required', 'string', 'in:'.implode(',', array_keys(MaterialDocument::CATEGORY_LABELS))],
            'notes' => ['nullable', 'string', 'max:2000'],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx,xls,xlsx'],
        ]);

        [$subject, $type] = $this->resolveSubject($request);
        $this->assertSubjectAccess($request, $subject, 'write');

        $file = $request->file('file');
        $path = $file->store('material-documents/'.$type, 'local');

        try {
            $document = $subject->documents()->create([
                'project_id' => $subject->project_id,
                'department_id' => $subject->department_id,
                'category' => $data['category'],
                'file_path' => $path,
                'original_name' => mb_substr($file->getClientOriginalName(), 0, 255),
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'uploaded_by' => $request->user()->id,
                'notes' => $data['notes'] ?? null,
            ]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);

            throw $exception;
        }

        return response()->json($document->load('uploader:id,name'), 201);
    }

    public function destroy(Request $request, MaterialDocument $materialDocument): JsonResponse
    {
        $subject = $materialDocument->documentable;

        abort_unless($subject instanceof Model, 404, 'Dokumen material tidak ditemukan.');
        $this->assertSubjectAccess($request, $subject, 'write');

        $materialDocument->delete();

        return response()->json(['message' => 'OK']);
    }

    public function download(Request $request, MaterialDocument $materialDocument): StreamedResponse
    {
        $subject = $materialDocument->documentable;

        abort_unless($subject instanceof Model, 404, 'Dokumen material tidak ditemukan.');
        $this->assertSubjectAccess($request, $subject, 'view');

        $path = (string) $materialDocument->getRawOriginal('file_path');

        abort_unless(Storage::disk('local')->exists($path), 404, 'Berkas dokumen tidak ditemukan.');

        return Storage::disk('local')->download(
            $path,
            $materialDocument->original_name,
            array_filter(['Content-Type' => $materialDocument->mime_type])
        );
    }

    /**
     * @return array{0: Model, 1: string}
     */
    private function resolveSubject(Request $request): array
    {
        $type = (string) $request->input('documentable_type');
        $id = (int) $request->input('documentable_id');

        abort_unless(isset(self::SUBJECTS[$type]), 422, 'Jenis dokumen material tidak dikenal.');
        abort_unless($id > 0, 422, 'ID dokumen material tidak valid.');

        $model = self::SUBJECTS[$type]::query()->findOrFail($id);

        return [$model, $type];
    }

    private function assertSubjectAccess(Request $request, Model $subject, string $ability): void
    {
        $user = $request->user();
        $permission = $ability === 'write' ? 'stock.write' : 'stock.view';

        abort_unless(
            $user?->hasPermission($permission),
            403,
            'Akses ditolak: butuh izin '.$permission
        );

        if ($user->isSuperAdmin()) {
            return;
        }

        abort_unless(
            $user->department_id && (int) $subject->department_id === (int) $user->department_id,
            403,
            'Dokumen material ini milik departemen lain.'
        );
    }
}
