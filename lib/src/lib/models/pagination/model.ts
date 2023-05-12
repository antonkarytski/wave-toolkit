import { attach, createEffect, createEvent, restore, sample } from 'effector'
import { noop } from '../../../common/helpers'
import { GetNextFxProps, PaginatedListModelProps } from './types'
import { createStateModel } from '../state'

export class PaginatedListModel<T, R, P> {
  private readonly request
  private readonly itemsExtractor
  private readonly nextPageGetter
  private readonly totalCountGetter 
  private readonly currentPageGetter 
  private readonly nextPage = createStateModel<number | null>(1)
  private readonly defaultProps
  private readonly staticProps

  public readonly init = createEvent<P>()

  public constructor({
    request,
    itemsExtractor,
    nextPageFilter,
    totalCountGetter,
    currentPageGetter,
    defaultProps,
    staticProps
  }: PaginatedListModelProps<T, R, P>) {
    this.defaultProps = defaultProps
    this.staticProps = staticProps
    this.request = request
    this.itemsExtractor = itemsExtractor
    this.nextPageGetter = nextPageFilter
    this.totalCountGetter = totalCountGetter
    this.currentPageGetter = currentPageGetter

    this.get.done.watch(this.resetListWith)
    this.refresh.done.watch(this.resetListWith)

    sample({
      source: this.$items,
      clock: this.getNextPageFx.done,
      fn: (items, { result, params }) => {
        if (!result || !params.page) return
        const newItems = this.itemsExtractor(result)
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
      const { response } = nextPageProps
      this.setTotalCount(this.totalCountGetter?.(response))
      this.setCurrentPage(this.currentPageGetter?.(response))
    })

    sample({
      source: this.$items,
      clock: this.init,
      filter: items => !items.length,
      fn: (_, props) => props,
    }).watch(this.getSync)
  }

  private readonly resetListWith = ({ result }: { result: R }) => {
    const items = this.itemsExtractor(result)
    this.setItems(items)
    const nextPage = this.nextPageGetter({
      total: items.length,
      response: result,
      page: 1,
    })
    this.nextPage.set(nextPage)
    this.setTotalCount(this.totalCountGetter?.(result))
    this.setCurrentPage(this.currentPageGetter?.(result))
  }

  private readonly setCurrentPage = createEvent<number | undefined>()
  public readonly $currentPage = restore(this.setCurrentPage)

  private readonly setTotalCount = createEvent<number | undefined>()
  public readonly $totalCount = restore(this.setTotalCount)

  public readonly get = createEffect((props: P) => {
    return this.request({
      page: 1,
      ...this.staticProps,
      ...props,
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
        ...this.staticProps,
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
