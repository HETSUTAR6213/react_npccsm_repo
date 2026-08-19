export default function ConnectionBanner({ show }) {
  if (!show) return null;
  return (
    <div className="rounded-xl p-3 text-xs md:text-sm font-bold text-center border shadow-sm bg-amber-50 border-amber-200 text-amber-700">
      <i className="fas fa-triangle-exclamation mr-2" />
      Running in offline mode (saved to this browser only) — connect Supabase in your{' '}
      <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file to sync across devices.
    </div>
  );
}
