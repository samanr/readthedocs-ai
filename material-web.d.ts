import type { DetailedHTMLProps, HTMLAttributes } from "react"

type MdElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>

type MdTextFieldProps = MdElementProps & {
  label?: string
  value?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  rows?: number
}

type MdButtonProps = MdElementProps & {
  disabled?: boolean
}

type MdNavigationBarProps = MdElementProps & {
  "active-index"?: number
  "hide-inactive-labels"?: boolean
}

type MdNavigationTabProps = MdElementProps & {
  active?: boolean
  label?: string
  "hide-inactive-label"?: boolean
  disabled?: boolean
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "md-filled-button": MdButtonProps
      "md-outlined-button": MdButtonProps
      "md-text-button": MdButtonProps
      "md-elevated-button": MdButtonProps
      "md-filled-tonal-button": MdButtonProps
      "md-outlined-text-field": MdTextFieldProps
      "md-filled-text-field": MdTextFieldProps
      "md-circular-progress": MdElementProps & { indeterminate?: boolean }
      "md-divider": MdElementProps
      "md-navigation-bar": MdNavigationBarProps
      "md-navigation-tab": MdNavigationTabProps
      "md-filled-card": MdElementProps
      "md-outlined-card": MdElementProps
      "md-elevated-card": MdElementProps
      "md-icon-button": MdButtonProps
    }
  }
}
