import './Button.css'

/**
 * Defines the value provided to the reusable Button component.
 */
type ButtonProps = {

  /** Text displayed inside the button */
  text: string
  /** Optional function when clicked */
  onClick?: () => void
  /** Optional property when clicked */
  disabled?: boolean
}

/**
 * Reusable button component that displays the provided text and optionally handles clicking.
 * 
 * @param text - Text displayed inside button 
 * @param onClick - Optional callback when button is clicked
 * @param disabled - Determines whether the button disabled
 * @returns 
 */
function Button({
  text,
  onClick,
  disabled = false,
}: ButtonProps) {

  return (
    <button
      type="button"
      className="button"
      onClick={onClick}
      disabled={disabled}
    >
      {text}
    </button>
  )
}

export default Button