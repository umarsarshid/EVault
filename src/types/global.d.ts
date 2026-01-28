export {}

declare global {
  interface Window {
    __evvaultInstallPrompt?: BeforeInstallPromptEvent | null
  }

  // Not in the TS lib by default in many setups:
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  }
}
