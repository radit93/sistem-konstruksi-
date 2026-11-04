<!DOCTYPE html>
<html lang="id" data-footer="true" data-show="true" data-override='{"attributes": {"placement": "vertical", "layout": "fluid", "color": "light-blue"}}'>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>PCM Piping Suite &bull; Job No. 2428</title>
    <meta name="description" content="Dashboard Pengendalian Proyek Piping Multi-Role - PCM 2428" />

    <!-- Favicon -->
    <link rel="icon" type="image/png" href="/img/favicon/favicon-32x32.png" sizes="32x32" />

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.gstatic.com" />
    <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700;800;900&display=swap" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/font/CS-Interface/style.css" />

    <!-- Acorn & Bootstrap Styles -->
    <link rel="stylesheet" href="/css/vendor/bootstrap.min.css?v={{ time() }}" />
    <link rel="stylesheet" href="/css/vendor/OverlayScrollbars.min.css?v={{ time() }}" />
    <link rel="stylesheet" href="/css/styles.css?v={{ time() }}" />
    <link rel="stylesheet" href="/css/main.css?v={{ time() }}" />

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

    <!-- Vendor Scripts -->
    <script src="/js/vendor/jquery-3.5.1.min.js"></script>
    <script src="/js/vendor/bootstrap.bundle.min.js"></script>
    <script src="/js/vendor/OverlayScrollbars.min.js"></script>
    <script src="/js/vendor/autoComplete.min.js"></script>
    <script src="/js/vendor/clamp.min.js"></script>

    <!-- Acorn Icons -->
    <script src="/icon/acorn-icons.js"></script>
    <script src="/icon/acorn-icons-interface.js"></script>
    <script src="/icon/acorn-icons-commerce.js"></script>

    <!-- Template Base Scripts -->
    <script src="/js/base/helpers.js"></script>
    <script src="/js/base/globals.js"></script>
    <script src="/js/base/nav.js"></script>
    <script src="/js/base/pcm-menu.js"></script>
    <script src="/js/base/settings.js"></script>

    <!-- Template Common Scripts & Scripts -->
    <script src="/js/common.js"></script>
    <script src="/js/scripts.js"></script>

    <!-- React App Bundle. Versi ikut waktu ubah berkas supaya browser tidak
         memakai bundel lama setelah deploy. -->
    <script src="/build/app.js?v={{ filemtime(public_path('build/app.js')) }}"></script>
</body>
</html>
