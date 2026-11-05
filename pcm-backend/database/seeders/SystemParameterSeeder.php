<?php

namespace Database\Seeders;

use App\Models\SystemParameter;
use Illuminate\Database\Seeder;

class SystemParameterSeeder extends Seeder
{
    public function run(): void
    {
        $parameters = [
            // Kategori Plant Area
            [
                'category' => 'plant_area',
                'code' => 'MPP',
                'name' => 'MPP Area',
                'description' => 'Main Process Plant Area',
                'sort_order' => 1,
            ],
            [
                'category' => 'plant_area',
                'code' => 'TANK_FARM',
                'name' => 'Tank Farm Area',
                'description' => 'Area Tangki Penyimpanan & Penampungan',
                'sort_order' => 2,
            ],
            [
                'category' => 'plant_area',
                'code' => 'FLARE',
                'name' => 'Flare & Vent Area',
                'description' => 'Area Pembakaran Gas Buang',
                'sort_order' => 3,
            ],
            [
                'category' => 'plant_area',
                'code' => 'UTILITY',
                'name' => 'Utility & Boiler Area',
                'description' => 'Area Utilitas, Air Pendingin & Uap',
                'sort_order' => 4,
            ],
            [
                'category' => 'plant_area',
                'code' => 'MANIFOLD',
                'name' => 'Metering & Manifold Station',
                'description' => 'Stasiun Pengukuran & Valve Manifold',
                'sort_order' => 5,
            ],
            [
                'category' => 'plant_area',
                'code' => 'PIPE_RACK',
                'name' => 'Offsite / Pipe Rack Header',
                'description' => 'Jalur Pipa Antar-Unit & Pipe Rack Utama',
                'sort_order' => 6,
            ],

            // Kategori Target Distribusi
            [
                'category' => 'distribution_target',
                'code' => 'WORKSHOP',
                'name' => 'Workshop Spool Fabrication',
                'description' => 'Bengkel Fabrikasi Spool Utama',
                'sort_order' => 1,
            ],
            [
                'category' => 'distribution_target',
                'code' => 'FIELD_ERECTION',
                'name' => 'Field Erection & Site Team',
                'description' => 'Tim Pemasangan Jalur Pipa Lapangan',
                'sort_order' => 2,
            ],
            [
                'category' => 'distribution_target',
                'code' => 'QAQC',
                'name' => 'QA/QC Department & Inspector',
                'description' => 'Tim Inspeksi Mutu & Pengujian NDT',
                'sort_order' => 3,
            ],
            [
                'category' => 'distribution_target',
                'code' => 'CLIENT_REP',
                'name' => 'Client / Owner Representative',
                'description' => 'Pihak Perwakilan Pemilik Proyek',
                'sort_order' => 4,
            ],
            [
                'category' => 'distribution_target',
                'code' => 'DOC_CONTROL',
                'name' => 'Document Control Archive',
                'description' => 'Arsip Resmi Master Transmittal',
                'sort_order' => 5,
            ],
        ];

        foreach ($parameters as $param) {
            SystemParameter::updateOrCreate(
                ['category' => $param['category'], 'name' => $param['name']],
                $param
            );
        }
    }
}
