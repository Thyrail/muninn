import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the workspace layout so nothing jumps when the notebook has loaded. */
export default function Loading() {
  return (
    <div
      className="flex min-h-0 w-full flex-1 flex-col px-4 pt-3 pb-4 sm:px-6"
      aria-busy="true"
      aria-label="Wird geladen"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="mt-3 grid min-h-0 flex-1 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)_16rem]">
        <div className="space-y-2 max-lg:hidden">
          <Skeleton className="h-10" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="rounded-xl" />
        <div className="space-y-2 max-lg:hidden">
          <Skeleton className="h-10" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </div>
  );
}
