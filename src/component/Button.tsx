import './Button.css'

/**
 * Defines the value provided to the reusable Button component.
 */
type ButtonProps = {

  /** Text displayed inside the button (ignored if children is provided) */
  text?: string
  /** Content displayed inside the button, takes priority over text */
  children?: React.ReactNode
  /** Optional function when clicked */
  onClick?: () => void
  /** Optional property when clicked */
  disabled?: boolean
  /** Optional extra class name(s) appended to the base "button" class */
  className?: string
}

/**
 * Reusable button component that displays the provided text and optionally handles clicking.
 * 
 * @param text - Text displayed inside button 
 * @param children - Content displayed inside button, takes priority over text
 * @param onClick - Optional callback when button is clicked
 * @param disabled - Determines whether the button disabled
 * @param className - Optional extra class name(s) appended to the base "button" class
 * @returns 
 */
function Button({
  text,
  children,
  onClick,
  disabled = false,
  className = '',
}: ButtonProps) {

  return (
    <button
      type="button"
      className={`button ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? text}
    </button>
  )
}

export default Button