import "./BudgetModal.css";

interface BudgetModalProps {
  open:boolean;
  month:string;
  year:number;
  amount:number;
  onClose:()=>void;
}

function BudgetModal({
  open,
  month,
  year,
  amount,
  onClose
}:BudgetModalProps){

  if(!open) return null;

  return(
    <div className="budget-overlay">

      <div className="budget-box">

        <div className="budget-icon">
          💰
        </div>

        <h2>
          Budget Saved!
        </h2>

        <p>
          Your monthly spare cash for{" "}
          <strong>
            {month} {year}
          </strong>
          {" "}is:
        </p>

        <h3>
          RM {amount}
        </h3>

        <button onClick={onClose}>
          Continue
        </button>

      </div>

    </div>
  );
}

export default BudgetModal;