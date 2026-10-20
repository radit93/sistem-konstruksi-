<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The one explicit bypass in the access model. Every other grant comes
        // from the permission_role table. Returning null (not false) lets the
        // normal checks run for everyone else.
        Gate::before(function (User $user) {
            return $user->isSuperAdmin() ? true : null;
        });
    }
}
