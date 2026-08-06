import "./GoalModal.css";

interface Goal {
  name:string;
  monthlySaving:number;
}

interface GoalModalProps {
  open:boolean;
  status:"reachable" | "unreachable";
  goals:Goal[];
  onClose:()=>void;
  onContinue:()=>void;
}

function GoalModal({
  open,
  status,
  goals,
  onClose,
  onContinue
}:GoalModalProps){

  if(!open) return null;

  return(
    <div className="modal-overlay">

      <div className="modal-box">

        {
          status === "reachable" ? (

            <>
              <div className="success-icon">
                ✅
              </div>

              <h2>
                All Goals Are Reachable!
              </h2>

              <p>
                Your current monthly spare cash is enough
                to achieve all goals before their deadlines.
              </p>

              <button
                className="continue-button"
                onClick={onContinue}
              >
                Generate Allocation
              </button>
            </>

          ) : (

            <>
              <div className="warning-icon">
                ⚠️
              </div>

              <h2>
                Goals Are Not Reachable
              </h2>

              <p>
                Some goals cannot be completed with your
                current spare cash.
              </p>

              <div className="unreachable-list">

                {
                  goals.map((goal,index)=>(

                    <div
                      className="goal-warning"
                      key={index}
                    >

                      <strong>
                        {goal.name}
                      </strong>

                      <br/>

                      Required:
                      RM {goal.monthlySaving}/month

                    </div>

                  ))
                }

              </div>

              <p>
                Try increasing savings, lowering the target
                amount, or extending the deadline.
              </p>

              <button
                className="close-button"
                onClick={onClose}
              >
                Reconsider Goals
              </button>

            </>

          )

        }

      </div>

    </div>
  );
}

export default GoalModal;