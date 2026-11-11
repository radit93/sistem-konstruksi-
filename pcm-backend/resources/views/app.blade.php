<!DOCTYPE html>
<html lang="id" data-footer="true" data-show="true" data-override='{"attributes": {"placement": "vertical", "behaviour": "pinned", "layout": "fluid", "color": "light-blue"}}'>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>PCM Piping Suite &bull; Job No. 2428</title>
    <meta name="description" content="Dashboard Pengendalian Proyek Piping Multi-Role - PCM 2428" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/acorn/img/favicon/favicon-32x32.png" sizes="32x32" />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/acorn/font/CS-Interface/style.css" />

    <!-- Acorn & Bootstrap Styles (direct /acorn path agar bekerja di Windows maupun Linux) -->
    @if(file_exists(public_path('acorn/css/vendor/bootstrap.min.css')))
        <link rel="stylesheet" href="/acorn/css/vendor/bootstrap.min.css?v={{ filemtime(public_path('acorn/css/vendor/bootstrap.min.css')) }}" />
    @else
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" />
    @endif
    @if(file_exists(public_path('acorn/css/vendor/OverlayScrollbars.min.css')))
        <link rel="stylesheet" href="/acorn/css/vendor/OverlayScrollbars.min.css?v={{ filemtime(public_path('acorn/css/vendor/OverlayScrollbars.min.css')) }}" />
    @endif
    <link rel="stylesheet" href="/acorn/css/styles.css?v={{ filemtime(public_path('acorn/css/styles.css')) }}" />
    <link rel="stylesheet" href="/acorn/css/main.css?v={{ filemtime(public_path('acorn/css/main.css')) }}" />

    <!-- Tailwind Utility Support (tanpa merusak style native Bootstrap/Acorn) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            corePlugins: {
                preflight: false
            },
            theme: {
                extend: {
                    colors: {
                        primary: '#1d4ed8',
                        'primary-dark': '#1e40af'
                    }
                }
            }
        };
    </script>

    <style>
        #root {
            opacity: 1 !important;
            visibility: visible !important;
        }
        /* Penyesuaian agar transisi rendering Acorn stabil */
        html[data-show=true] #root {
            opacity: 1 !important;
        }

        /* Sidebar, menu and layout sizing live in /css/main.css so there is one
           source of truth. Duplicating them here silently overrode main.css,
           because this block loads after it. */
    </style>
</head>
<body>
    <div id="root">
        <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted fw-bold mt-3">Memuat PCM Piping Suite Job 2428...</div>
            </div>
        </div>
    </div>

    <!-- Vendor Scripts (fallback ke CDN jika public/acorn/js/vendor ter-ignore git) -->
    @if(file_exists(public_path('acorn/js/vendor/jquery-3.5.1.min.js')))
        <script src="/acorn/js/vendor/jquery-3.5.1.min.js"></script>
        <script src="/acorn/js/vendor/bootstrap.bundle.min.js"></script>
        <script src="/acorn/js/vendor/OverlayScrollbars.min.js"></script>
        <script src="/acorn/js/vendor/autoComplete.min.js"></script>
        <script src="/acorn/js/vendor/clamp.min.js"></script>
    @else
        <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    @endif

    <!-- Acorn Icons -->
    <script src="/acorn/icon/acorn-icons.js"></script>
    <script src="/acorn/icon/acorn-icons-interface.js"></script>
    <script src="/acorn/icon/acorn-icons-commerce.js"></script>

    <!-- Template Base Scripts -->
    <script src="/acorn/js/base/helpers.js"></script>
    <script src="/acorn/js/base/globals.js"></script>
    <script src="/acorn/js/base/nav.js"></script>
    <script src="/acorn/js/base/pcm-menu.js"></script>
    <script src="/acorn/js/base/settings.js"></script>

    <!-- Template Common Scripts & Scripts -->
    <script src="/acorn/js/common.js"></script>
    <script src="/acorn/js/scripts.js"></script>

    <!-- React App Bundle. Versi ikut waktu ubah berkas supaya browser tidak
         memakai bundel lama setelah deploy. -->
    <script src="/build/app.js?v={{ filemtime(public_path('build/app.js')) }}"></script>
</body>
</html>
