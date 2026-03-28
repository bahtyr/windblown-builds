import {redirect} from "next/navigation";

type PagePropsLocal = {
  params?: Promise<Record<string, string>>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Redirect legacy type-specific routes to the unified browse page.
 *
 * @param {PagePropsLocal} props - Route params from Next.js dynamic segment.
 */
export default async function LegacyTypePage({searchParams}: PagePropsLocal) {
  const resolvedSearchParams = await searchParams;
  const nextSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => nextSearchParams.append(key, entry));
      continue;
    }
    if (value !== undefined) {
      nextSearchParams.set(key, value);
    }
  }

  const suffix = nextSearchParams.size > 0 ? `?${nextSearchParams.toString()}` : "";
  redirect(`/browse${suffix}`);
}
