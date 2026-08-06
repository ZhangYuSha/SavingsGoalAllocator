import './Button.css'

type ButtonProps = {
  text: string;
  onClick?: () => void;
};

function Button({ text, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className="button"
      onClick={onClick}
    >
      {text}
    </button>
  );
}

export default Button;