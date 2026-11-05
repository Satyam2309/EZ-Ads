export default function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-(--radius-card) border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
