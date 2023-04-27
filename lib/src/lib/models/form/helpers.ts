import { mapObject } from '../../../common/helpers'
import { ValidationFieldPair, ValidationList, ValidationState } from './types'

export const valid: ValidationState = {
  isValid: true,
}
export const invalid = (message: string): ValidationState => ({
  isValid: false,
  message,
})

export function validateWoSchema<T extends Record<string, any>>(
  fields: T,
  defaultValues?: T,
) {
  let isValid = true
  const list = mapObject(fields, (value, key) => {
    if (value || (defaultValues && defaultValues[key] === undefined)) {
      return valid
    }
    isValid = false
    return invalid('Field is required')
  })
  return { list, isValid }
}

export function mergeValidation<T extends Record<string, any>>(
  currentValidation: ValidationList<T>,
  field: ValidationFieldPair<keyof T>,
) {
  const list = { ...currentValidation, [field.key]: field.value }
  for (const key in list) {
    const currentField = list[key]
    if (currentField === null) {
      return { list, isValid: null }
    }
    if (currentField !== valid) {
      return { list, isValid: false }
    }
  }
  return { list, isValid: true }
}
