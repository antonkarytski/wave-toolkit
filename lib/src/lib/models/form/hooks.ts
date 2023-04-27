import { useStore, useStoreMap } from 'effector-react'
import { useCallback } from 'react'
import { FormModel } from './model.form'

export const useFormField = <T extends Record<string, any>, K extends keyof T>(
  form: FormModel<T>,
  key: K
) => {
  const fieldValue = useStoreMap({
    store: form.$store,
    keys: [key, form],
    fn: (fields) => fields[key],
  })

  const updateField = useCallback(
    (value: T[K]) => form.setField({ value, key }),
    [form, key]
  )

  return [fieldValue, updateField] as [T[K], (value: T[K]) => void]
}
export const useFieldValidation = <LT extends Record<string, any>>(
  form: FormModel<LT>,
  key: keyof LT
) => {
  return useStoreMap({
    store: form.validation.$fields,
    keys: [key, form],
    fn: (fields) => fields[key],
  })
}

export const useValidation = <T extends Record<string, any>>(
  model: FormModel<T>
) => {
  return useStore(model.validation.$state)
}

export const useSpecificTypeFormField = <LT extends Record<string, any>, T>(
  form: FormModel<LT>,
  name: keyof LT
) => {
  return useFormField(form, name) as [T, (value: T) => void]
}
