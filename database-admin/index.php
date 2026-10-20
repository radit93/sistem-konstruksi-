<?php
// Simple, clean database viewer for PCM Dashboard (MariaDB 3307)
$host = '127.0.0.1';
$port = 3307;
$user = 'root';
$pass = '';
$db   = 'pcm_dashboard';

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (Exception $e) {
    die("Koneksi gagal: " . $e->getMessage());
}

$tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
$currentTable = isset($_GET['table']) && in_array($_GET['table'], $tables) ? $_GET['table'] : ($tables[0] ?? '');

$rows = [];
$columns = [];
if ($currentTable) {
    $columns = $pdo->query("DESCRIBE `$currentTable`")->fetchAll();
    $rows = $pdo->query("SELECT * FROM `$currentTable` ORDER BY 1 DESC LIMIT 100")->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Explorer &bull; PCM Piping (MariaDB 3307)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex flex-col">

    <!-- Top Navigation -->
    <header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-600 text-white font-extrabold flex items-center justify-center text-base shadow-sm">
                SQL
            </div>
            <div>
                <h1 class="font-extrabold text-slate-900 leading-none">Database Explorer</h1>
                <small class="text-xs text-slate-500 font-mono">pcm_dashboard &bull; 127.0.0.1:3307</small>
            </div>
        </div>
        <div class="flex items-center gap-2">
            <a href="http://127.0.0.1:8001" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition">
                &larr; Buka Dashboard PCM
            </a>
            <a href="adminer.php?server=127.0.0.1%3A3307&username=root&db=pcm_dashboard" class="text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition">
                Mode Adminer &rarr;
            </a>
        </div>
    </header>

    <!-- Main Content Grid -->
    <div class="flex-grow flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        <!-- Sidebar Daftar Tabel -->
        <aside class="w-full md:w-64 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-sm h-fit">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Daftar Tabel</span>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"><?= count($tables) ?> Tabel</span>
            </div>
            <nav class="space-y-1">
                <?php foreach ($tables as $t): ?>
                    <a href="?table=<?= $t ?>" class="block px-3 py-2 rounded-lg text-xs font-semibold transition <?= $t === $currentTable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900' ?>">
                        <span class="font-mono"><?= $t ?></span>
                    </a>
                <?php endforeach; ?>
            </nav>
        </aside>

        <!-- Main Table Content -->
        <main class="flex-grow bg-white border border-slate-200 rounded-xl p-4 md:p-6 shadow-sm overflow-hidden flex flex-col">
            <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-2">
                <div>
                    <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">TABEL AKTIF</span>
                    <h2 class="text-xl font-bold text-slate-900 font-mono mt-1"><?= htmlspecialchars($currentTable) ?></h2>
                </div>
                <div class="text-xs text-slate-500">
                    Menampilkan <strong><?= count($rows) ?></strong> baris data terbaru
                </div>
            </div>

            <!-- Table View -->
            <div class="border border-slate-200 rounded-lg overflow-x-auto flex-grow max-h-[600px] overflow-y-auto">
                <table class="w-full text-left text-xs border-collapse">
                    <thead class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <?php foreach ($columns as $col): ?>
                                <th class="py-2.5 px-3.5 whitespace-nowrap bg-slate-50">
                                    <?= htmlspecialchars($col['Field']) ?>
                                    <span class="text-[10px] text-slate-400 font-normal lowercase block"><?= htmlspecialchars($col['Type']) ?></span>
                                </th>
                            <?php endforeach; ?>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        <?php if (empty($rows)): ?>
                            <tr>
                                <td colspan="<?= count($columns) ?>" class="py-8 text-center text-slate-400">
                                    Tabel ini masih kosong (0 baris).
                                </td>
                            </tr>
                        <?php else: ?>
                            <?php foreach ($rows as $r): ?>
                                <tr class="hover:bg-slate-50 transition">
                                    <?php foreach ($columns as $col): ?>
                                        <td class="py-2 px-3.5 text-slate-700 font-mono text-[11px] whitespace-nowrap max-w-xs truncate" title="<?= htmlspecialchars((string)($r[$col['Field']] ?? '')) ?>">
                                            <?php if ($r[$col['Field']] === null): ?>
                                                <span class="text-slate-300 italic">NULL</span>
                                            <?php else: ?>
                                                <?= htmlspecialchars((string)$r[$col['Field']]) ?>
                                            <?php endif; ?>
                                        </td>
                                    <?php endforeach; ?>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </main>

    </div>

</body>
</html>
