export type ClassLike = {
  id?: number | string;
  className?: string | null;
  class_name?: string | null;
  name?: string | null;
  title?: string | null;
  label?: string | null;
  niveau?: string | null;
  section?: {
    sectionName?: string | null;
    section_name?: string | null;
    educationalLevel?: string | null;
  } | null;
};

export function getClassDisplayName(cls: ClassLike | null | undefined, fallback = "Classe") {
  const value =
    cls?.className ??
    cls?.class_name ??
    cls?.name ??
    cls?.title ??
    cls?.label ??
    null;

  if (typeof value === "string" && value.trim()) return value.trim();
  if (cls?.id !== undefined && cls?.id !== null) return `${fallback} ${cls.id}`;
  return fallback;
}
