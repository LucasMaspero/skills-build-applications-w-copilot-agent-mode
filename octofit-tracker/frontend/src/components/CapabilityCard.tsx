import { useEffect, useState, type ReactNode } from 'react';

type Props<T> = {
  title: string;
  description: string;
  emptyMessage: string;
  loadItems: () => Promise<T[]>;
  renderItem: (item: T) => ReactNode;
};

export function CapabilityCard<T>({ title, description, emptyMessage, loadItems, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadItems().then((loadedItems) => {
      if (active) setItems(loadedItems);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'An unexpected error occurred.');
    });
    return () => {
      active = false;
    };
  }, [loadItems]);

  return <section className="card h-100"><div className="card-body">
    <h2 className="h4">{title}</h2>
    <p>{description}</p>
    {items === null && error === null && <p role="status">Loading {title.toLowerCase()}...</p>}
    {error !== null && <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>}
    {items?.length === 0 && <p>{emptyMessage}</p>}
    {items?.map((item, index) => <p key={index}>{renderItem(item)}</p>)}
  </div></section>;
}
