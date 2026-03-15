type ProfileLocation = {
  default_location_state?: string | null
  default_location_city?: string | null
}

/**
 * Returns the default location string for documents (reports, certificates, prescriptions).
 * Format: "Estado - Cidade" or "Estado" if no city, or "—" if neither set.
 */
export function getProfileDefaultLocation(profile: ProfileLocation): string {
  const state = profile.default_location_state?.trim()
  const city = profile.default_location_city?.trim()
  if (!state) return "—"
  if (!city) return state
  return `${state} - ${city}`
}
