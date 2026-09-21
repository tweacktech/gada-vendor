import { useEffect } from "react"

const APP_TITLE_PREFIX = "Gadaride"

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle
      ? `${APP_TITLE_PREFIX} | ${pageTitle}`
      : APP_TITLE_PREFIX
  }, [pageTitle])
}
