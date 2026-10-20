// Satu tempat untuk pertanyaan "boleh atau tidak". Superadmin selalu boleh
// (Gate::before di server), role lain mengikuti izin dari tabel permission_role.
export function can(user, code) {
    if (!user) return false;
    if (user.is_superadmin) return true;
    return (user.permissions || []).includes(code);
}
