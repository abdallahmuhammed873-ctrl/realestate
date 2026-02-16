import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border bg-white p-10 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link href="/" className="mt-3 inline-block text-brand-700">
        Return home
      </Link>
    </div>
  );
}
