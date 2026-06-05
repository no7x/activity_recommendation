export function orUndefined(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}
