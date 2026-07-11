const INCLUDE_DATA_KEY = 'lift_assistant_include_data'

export function getAssistantIncludeDataPref(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(INCLUDE_DATA_KEY) === '1'
}

export function setAssistantIncludeDataPref(value: boolean): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(INCLUDE_DATA_KEY, value ? '1' : '0')
}
