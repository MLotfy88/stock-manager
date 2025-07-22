
import * as React from "react"

export function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState<boolean>(false)

  React.useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    
    // Set initial value
    setMatches(media.matches)
    
    // Listen for changes
    media.addEventListener("change", onChange)
    
    // Clean up
    return () => media.removeEventListener("change", onChange)
  }, [query])

  return matches
}
