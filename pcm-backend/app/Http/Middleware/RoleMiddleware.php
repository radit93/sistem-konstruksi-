<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    // ponytail: string roles "manager,engineer"; upgrade ke Spatie Permission bila butuh granular.
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $allowed = explode(',', $roles);
        if (! $request->user() || ! in_array($request->user()->role, $allowed)) {
            return response()->json(['message' => 'Forbidden untuk role ini'], 403);
        }
        return $next($request);
    }
}
