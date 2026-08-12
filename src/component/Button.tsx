import './Button.css'

type ButtonProps = {
  text: string
  onClick?: () => void
  disabled?: boolean
}

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