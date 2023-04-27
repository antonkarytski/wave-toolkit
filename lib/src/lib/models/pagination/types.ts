import { Effect } from "effector";

export type GetNextFxProps<P> = {
  page: number | null;
  isLoading?: boolean;
};

export type NextPageFilterProps<R> = {
  total: number;
  page: number;
  response: R;
};
export type PaginatedListModelProps<T, R, P> = {
  request: Effect<P, R>;
  itemExtractor: (response: R) => T[];
  nextPageFilter: (props: NextPageFilterProps<R>) => number | null;
  defaultProps?: P;
};
