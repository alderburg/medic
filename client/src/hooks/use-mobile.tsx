import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // Lê a classe CSS que foi definida instantaneamente no HTML
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.body.classList.contains('is-mobile')
    }
    return false
  })

  React.useEffect(() => {
    // Monitora mudanças na classe CSS
    const observer = new MutationObserver(() => {
      setIsMobile(document.body.classList.contains('is-mobile'))
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  return isMobile
}
