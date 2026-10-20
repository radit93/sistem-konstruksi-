<?php

use Illuminate\Support\Facades\Route;

// Single Page Application (React 19 Entrypoint)
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
