import { useStore } from "effector-react";
import { PaginatedListModel } from "./model";

export function usePaginatedListModel<T, R, P>(
  model: PaginatedListModel<T, R, P>
) {
  const isRefreshing = useStore(model.$isRefreshing);
  const isLoading = useStore(model.$isLoading);
  const isNextLoading = useStore(model.$isNextLoading);
  const items = useStore(model.$items);

  return { items, isLoading, isNextLoading, isRefreshing };
}
