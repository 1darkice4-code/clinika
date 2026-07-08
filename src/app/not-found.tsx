import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-3 text-4xl font-semibold">Страница не найдена</h1>
      <p className="mt-4 text-muted-foreground">Раздел мог быть снят с публикации или адрес изменился.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        На главную
      </Link>
    </main>
  );
}
