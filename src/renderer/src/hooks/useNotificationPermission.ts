import { useEffect, useState } from 'react'

/**
 * Hook to check and manage notification permissions
 */
export function useNotificationPermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check permission on mount
    checkPermission()

    // Listen for permission required events
    const cleanup = (window as any).electron?.onNotificationPermissionRequired?.(() => {
      setHasPermission(false)
    })

    return () => {
      cleanup?.()
    }
  }, [])

  const checkPermission = async () => {
    try {
      setIsChecking(true)
      const granted = await (window as any).electron?.checkNotificationPermission?.()
      setHasPermission(granted ?? true) // Default to true if not available
    } catch (error) {
      console.error('Failed to check notification permission:', error)
      setHasPermission(true) // Default to true on error
    } finally {
      setIsChecking(false)
    }
  }

  const openSettings = () => {
    (window as any).electron?.openNotificationSettings?.()
  }

  return {
    hasPermission,
    isChecking,
    checkPermission,
    openSettings
  }
}
