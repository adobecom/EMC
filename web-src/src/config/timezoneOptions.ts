/**
 * Timezone options for event forms.
 */

import { getTimeZones } from '@vvo/tzdb'

export const TIMEZONE_OPTIONS = getTimeZones().map((tz) => ({
  id: tz.name,
  name: `${tz.name} (${tz.currentTimeFormat})`
}))
