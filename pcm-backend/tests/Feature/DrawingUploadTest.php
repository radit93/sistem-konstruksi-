<?php

namespace Tests\Feature;

use App\Models\Drawing;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DrawingUploadTest extends TestCase
{
    public function test_engineer_can_upload_drawing_with_file_and_excel_fields(): void
    {
        Storage::fake('public');

        $login = $this->postJson('/api/login', [
            'email' => 'engineer@pcm.local',
            'password' => 'pcm123',
        ]);
        $login->assertOk();
        $token = $login->json('token');

        $file = UploadedFile::fake()->create('ISO_2428_M15_SHT2.dwg', 2048, 'application/acad');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->post('/api/drawings', [
                'drawing_no' => '2428-M-15-MPP-AB-SHT2',
                'title' => 'Main Process Piping Line MPP-AB Sheet 2',
                'line_no' => 'MPP-AB-2428',
                'line_service' => 'Process Steam (HPS)',
                'area' => 'MPP Unit 2',
                'sheet' => 'Sheet 2 of 2',
                'rev' => '0',
                'material_spec' => 'ASTM A106 Gr. B',
                'size_range' => '2 inch - 4 inch Sch 40',
                'total_dia_inch' => 58.50,
                'total_joints' => 24,
                'distributed_to' => 'Workshop Spool Fabrication',
                'distribution_date' => '2026-10-13',
                'status' => 'active',
                'file' => $file,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('drawing_no', '2428-M-15-MPP-AB-SHT2')
            ->assertJsonPath('title', 'Main Process Piping Line MPP-AB Sheet 2')
            ->assertJsonPath('line_service', 'Process Steam (HPS)')
            ->assertJsonPath('material_spec', 'ASTM A106 Gr. B')
            ->assertJsonPath('rev', '0');

        $scanPath = $response->json('scan_path');
        $this->assertNotNull($scanPath);
        $this->assertStringStartsWith('/storage/drawings/', $scanPath);

        $storedRelative = str_replace('/storage/', '', $scanPath);
        Storage::disk('public')->assertExists($storedRelative);

        // Clean up created record for test idempotence
        Drawing::where('drawing_no', '2428-M-15-MPP-AB-SHT2')->delete();
    }

    public function test_engineer_cannot_create_project(): void
    {
        $login = $this->postJson('/api/login', [
            'email' => 'engineer@pcm.local',
            'password' => 'pcm123',
        ]);
        $login->assertOk();
        $token = $login->json('token');

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/projects', [
                'client' => 'PT Test Client',
                'name' => 'Proyek Test Eng',
                'job_no' => '9999',
            ]);

        $response->assertStatus(403);
    }
}
