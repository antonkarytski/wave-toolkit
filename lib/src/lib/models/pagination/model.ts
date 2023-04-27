import { attach, createEffect, createEvent, restore, sample } from 'effector'
import { noop } from '../../../common/helpers'
import { GetNextFxProps, PaginatedListModelProps } from './types'
import { createStateModel } from '../state'

export class PaginatedListModel<T, R, P> {
  private readonly request
  private readonly itemExtractor
  private readonly nextPageGetter
  private readonly nextPage = createStateModel<number | null>(1)
  private readonly defaultProps

  public readonly init = createEvent<P>()

  public constructor({
    request,
    itemExtractor,
    nextPageFilter,
    defaultProps,
  }: PaginatedListModelProps<T, R, P>) {
    this.defaultProps = defaultProps
    this.request = request
    this.itemExtractor = itemExtractor
    this.nextPageGetter = nextPageFilter

    this.get.done.watch(this.resetListWith)
    this.refresh.done.watch(this.resetListWith)

    sample({
      source: this.$items,
      clock: this.getNextPageFx.done,
      fn: (items, { result, params }) => {
        if (!result || !params.page) return
        const newItems = this.itemExtractor(result)
        return {
          newItems,
          total: newItems.length + items.length,
          page: params.page,
          response: result,
        }
      },
    }).watch(props => {
      if (!props) return
      const { newItems, ...nextPageProps } = props
      this.addItems(newItems)
      const nextPage = this.nextPageGetter(nextPageProps)
      this.nextPage.set(nextPage)
    })

    sample({
      source: this.$items,
      clock: this.init,
      filter: items => !items.length,
      fn: (_, props) => props,
    }).watch(this.getSync)
  }

  private readonly resetListWith = ({ result }: { result: R }) => {
    const items = this.itemExtractor(result)
    this.setItems(items)
    const nextPage = this.nextPageGetter({
      total: items.length,
      response: result,
      page: 1,
    })
    this.nextPage.set(nextPage)
  }

  public readonly get = createEffect((props: P) => {
    return this.request({
      ...props,
      page: 1,
    })
  })
  public readonly $isLoading = this.get.pending
  public readonly getSync = (props: P) => {
    this.get(props).catch(noop)
  }

  private getNextPageFx = createEffect(
    ({ page, isLoading }: GetNextFxProps<P>) => {
      if (!page || page === 1 || isLoading) return null
      return this.request({
        ...this.defaultProps!,
        page,
      })
    },
  )
  public readonly $isNextLoading = this.getNextPageFx.pending

  public readonly getNext = attach({
    source: {
      page: this.nextPage.$state,
      isLoading: this.$isNextLoading,
    },
    mapParams: (_: void, { page, isLoading }) => ({ page, isLoading }),
    effect: this.getNextPageFx,
  })
  public readonly getNextSync = () => {
    this.getNext().catch(noop)
  }

  public readonly refresh = createEffect(() => {
    return this.get(this.defaultProps!)
  })
  public readonly $isRefreshing = this.refresh.pending
  public readonly refreshSync = () => {
    this.refresh().catch(noop)
  }

  public readonly setItems = createEvent<T[]>()
  public readonly addItems = createEvent<T[]>()
  public readonly $items = restore<T[]>(this.setItems, []).on(
    this.addItems,
    (state, payload) => [...state, ...payload],
  )

  public readonly reset = () => {
    this.nextPage.reset()
    this.setItems([])
  }
}

export const createPaginatedListModel = <T, R, P>(
  props: PaginatedListModelProps<T, R, P>,
) => {
  return new PaginatedListModel(props)
}
