import * as React from "react"

// Must match Tailwind's `md:` breakpoint so CSS and JS agree on mobile vs desktop.
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  // useLayoutEffect fires synchronously before the browser paints, so the
  // sidebar switches from <div> to <Sheet> before the user sees anything.
  // This eliminates the ~1-second layout flash caused by useEffect.
  React.useLayoutEffect(() => {
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    update()
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", update)
    return () => mql.removeEventListener("change", update)
  }, [])

  return isMobile
}
