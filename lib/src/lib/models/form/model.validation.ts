import {
  Event,
  Store,
  createEffect,
  createEvent,
  createStore,
  restore,
  attach,
} from 'effector'
import { ObjectSchema, ValidationError } from 'yup'
import { mapObject } from '../../../common/helpers'
import { invalid, mergeValidation, valid, validateWoSchema } from './helpers'
import {
  ListValidationResult,
  SingleValidationResult,
  ValidateFieldProps,
  ValidationFieldPair,
  ValidationList,
  ValidationState,
} from './types'

export function createValidator<T extends Record<string, any>>(
  schema: T | ObjectSchema<T>,
  $values: Store<T>,
) {
  const yupSchema = schema.__isYupSchema__ ? schema : null
  const initialState: T = schema.__isYupSchema__ ? schema.getDefault() : schema
  const fullValidation = mapObject(initialState, () => valid)

  const setState = createEvent<boolean | null>()
  const $state = restore(setState, true)

  const setFields = createEvent<ValidationList<T>>()
  const setFieldValidation = createEvent<ValidationFieldPair<keyof T>>()
  const $fields = createStore<Record<keyof T, ValidationState | null>>(
    mapObject(initialState, () => null),
  )
    .on(setFieldValidation, (store, { key, value }) => {
      const currentValidation = store[key]
      if (
        currentValidation === value ||
        (currentValidation &&
          value &&
          currentValidation.message === value.message)
      ) {
        return
      }
      return { ...store, [key]: value }
    })
    .on(setFields, (_, payload) => payload)

  function updateFieldsValidation(result: ListValidationResult<T>) {
    setFields(result.list)
    setState(result.isValid)
    return result
  }

  function updateSingleValidation(
    current: Record<keyof T, ValidationState | null>,
    key: keyof T,
    value: ValidationState,
  ) {
    const fieldState: ValidationFieldPair<keyof T> = { key, value }
    const nextResult = mergeValidation(current, fieldState)
    setFieldValidation(fieldState)
    setState(nextResult.isValid)
    return { isValid: nextResult.isValid, result: valid }
  }

  const cast = attach({
    source: $values,
    mapParams: (_: void, source) => source,
    effect: createEffect((source: T): ListValidationResult<T> => {
      if (!yupSchema) {
        const result = validateWoSchema(source, initialState)
        return updateFieldsValidation(result)
      }
      return yupSchema
        .validate(source, { abortEarly: false })
        .then(() => {
          return updateFieldsValidation({ list: fullValidation, isValid: true })
        })
        .catch((errorsList: any) => {
          const list = { ...fullValidation }
          errorsList.inner?.forEach(({ path, message }: ValidationError) => {
            list[path as keyof T] = invalid(message)
          })
          return updateFieldsValidation({ list, isValid: false })
        })
    }),
  })

  const castField = attach({
    source: {
      values: $values,
      validation: $fields,
      isValid: $state,
    },
    mapParams: (key: keyof T, { values, ...sources }) => ({
      field: { key, value: values[key] },
      ...sources,
    }),
    effect: createEffect(
      ({
        field,
        isValid,
        validation,
      }: ValidateFieldProps<T>): SingleValidationResult => {
        if (!yupSchema) {
          return { isValid, result: valid }
        }
        return yupSchema
          .validateAt(field.key as string, { [field.key]: field.value })
          .then(() => {
            return updateSingleValidation(validation, field.key, valid)
          })
          .catch((e: any) => {
            return updateSingleValidation(
              validation,
              field.key,
              invalid(e.message),
            )
          })
      },
    ),
  })

  function resetField(key: keyof T) {
    setFieldValidation({ key, value: null })
  }

  function reset(event?: Event<any>) {
    if (event) {
      $state.on(event, () => null)
      $fields.reset(event)
      return
    }
    setState(null)
  }

  return {
    $fields,
    cast,
    $state,
    castField,
    reset,
    resetField,
  }
}
