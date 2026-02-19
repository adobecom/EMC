/* 
* <license header>
*/

/**
 * Google Places API Type Definitions
 * Minimal type definitions for the Google Places features we use
 */

declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          input: HTMLInputElement,
          opts?: AutocompleteOptions
        )
        addListener(
          eventName: string,
          handler: () => void
        ): void
        getPlace(): PlaceResult
        setBounds(bounds: LatLngBounds): void
      }

      interface AutocompleteOptions {
        types?: string[]
        fields?: string[]
        componentRestrictions?: { country: string | string[] }
      }

      interface PlaceResult {
        place_id?: string
        name?: string
        formatted_address?: string
        address_components?: AddressComponent[]
        geometry?: {
          location: LatLng
        }
        utc_offset_minutes?: number
      }

      interface AddressComponent {
        long_name: string
        short_name: string
        types: string[]
      }
    }

    class LatLng {
      lat(): number
      lng(): number
    }

    class LatLngBounds {
      constructor()
      extend(point: LatLng): void
    }

    // Event utility namespace
    namespace event {
      function clearInstanceListeners(instance: object): void
      function addListener(instance: object, eventName: string, handler: Function): MapsEventListener
      function removeListener(listener: MapsEventListener): void
    }

    interface MapsEventListener {
      remove(): void
    }
  }
}

// Make google available globally
interface Window {
  google: typeof google
}

