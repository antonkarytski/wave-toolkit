import { FieldPair } from './model.form'

export type ValidationState<M extends string = string> = {
  isValid: boolean
  message?: M
}
export type ValidationFieldPair<K extends string | number | symbol = string> = {
  key: K
  value: ValidationState | null
}
export type ValidationList<T extends Record<string, any>> = Record<
  keyof T,
  ValidationState | null
>

export type ListValidationResult<T extends Record<string, any>> = {
  list: ValidationList<T>
  isValid: boolean
}

export type SingleValidationResult = {
  isValid: boolean | null
  result: ValidationState
}
export type ValidateFieldProps<T extends Record<string, any>> = {
  field: FieldPair<T>
  validation: ValidationList<T>
  isValid: boolean | null
}
