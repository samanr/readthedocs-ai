type IconProps = {
  size?: number
}

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
}

export function HomeIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...baseProps}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h5V14h3v5.5h5V10" />
    </svg>
  )
}

export function UploadIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...baseProps}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </svg>
  )
}

export function AskIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...baseProps}>
      <path d="M21 11.5a8.4 8.4 0 0 1-8.4 8.4 8.4 8.4 0 0 1-4-1L4 20l1.1-3.4a8.3 8.3 0 0 1-1.1-4.1A8.4 8.4 0 0 1 12.6 4a8.4 8.4 0 0 1 8.4 7.5Z" />
      <path d="M9.8 9.3a2.3 2.3 0 1 1 3.2 2.1c-.7.3-1.1.8-1.1 1.5v.3" />
      <path d="M12 15.9v.1" />
    </svg>
  )
}

export function SendIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} {...baseProps}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export function RepeatIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z" />
    </svg>
  )
}

export function RefreshIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
      <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
    </svg>
  )
}
