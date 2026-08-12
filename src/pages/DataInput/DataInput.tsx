import "./DataInput.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../component/Button";
import GoalModal from "../../component/GoalModal";
import BudgetModal from "../../component/BudgetModal";
//Note: data input page for the counting information only
interface Goal {
  id:number;
  priority:number;
  month:string;
  year:number;
  name:string;
  startDate:string;
  deadline:string;
  targetAmount:number;
  monthlySaving:number;
  progress:number;
}

function DataInput(){

  const navigate = useNavigate();

  const [month,setMonth]=useState("January");
  const [year,setYear]=useState(new Date().getFullYear());
  const [spareCash,setSpareCash]=useState("");
  const [savedCash,setSavedCash]=useState(0);

  const [showBudgetModal,setShowBudgetModal]=useState(false);

  const [goalName,setGoalName]=useState("");
  const [targetAmount,setTargetAmount]=useState("");
  const [startDate,setStartDate]=useState("");
  const [deadline,setDeadline]=useState("");
  const [priority,setPriority]=useState(5);

  const [goals,setGoals]=useState<Goal[]>([]);

  const [showModal,setShowModal]=useState(false);
  const [allocationStatus,setAllocationStatus]=useState<"reachable"|"unreachable">("reachable");
  const [unreachableGoals,setUnreachableGoals]=useState<Goal[]>([]);


  const saveMonthlyCash=()=>{
    if(!spareCash)return;

    setSavedCash(Number(spareCash));
    setShowBudgetModal(true);
  };


  const addGoal=()=>{

    if(!goalName||!targetAmount||!startDate||!deadline)return;

    const start=new Date(startDate);
    const end=new Date(deadline);

    const months=(end.getFullYear()-start.getFullYear())*12+
    (end.getMonth()-start.getMonth())+1;

    const monthlySaving=Math.ceil(Number(targetAmount)/months);

    const newGoal:Goal={
      id:Date.now(),
      priority,
      month,
      year,
      name:goalName,
      startDate,
      deadline,
      targetAmount:Number(targetAmount),
      monthlySaving,
      progress:0
    };

    setGoals([...goals,newGoal]);

    setGoalName("");
    setTargetAmount("");
    setStartDate("");
    setDeadline("");
    setPriority(5);
  };


  const deleteGoal=(id:number)=>{
    setGoals(goals.filter(goal=>goal.id!==id));
  };


  const generateAllocation=()=>{

    const impossibleGoals=goals.filter(
      goal=>goal.monthlySaving>savedCash
    );

    if(impossibleGoals.length>0){
      setUnreachableGoals(impossibleGoals);
      setAllocationStatus("unreachable");
    }else{
      setAllocationStatus("reachable");
    }

    setShowModal(true);
  };


  return(
    <div className="container">

      <h1>Savings Goal Allocator</h1>

      <div className="card">

        <h2>Monthly Spare Cash</h2>

        <div className="dateSelector">

          <select value={month} onChange={e=>setMonth(e.target.value)}>
            {
              [
                "January","February","March","April",
                "May","June","July","August",
                "September","October","November","December"
              ].map(m=><option key={m}>{m}</option>)
            }
          </select>

          <select value={year} onChange={e=>setYear(Number(e.target.value))}>
            {
              Array.from({length:10},(_,i)=>{
                const current=new Date().getFullYear();
                return <option key={i}>{current+i}</option>
              })
            }
          </select>

        </div>


        <input
          type="number"
          placeholder="Spare cash per month"
          value={spareCash}
          onChange={e=>setSpareCash(e.target.value)}
        />


        <Button
          text="Save Monthly Budget"
          onClick={saveMonthlyCash}
        />

        {
          savedCash>0 &&
          <p>✅ Saved RM {savedCash} for {month} {year}</p>
        }

      </div>



      <div className="card">

        <h2>Add Savings Goal</h2>

        <input
          placeholder="Goal Name"
          value={goalName}
          onChange={e=>setGoalName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Target Amount"
          value={targetAmount}
          onChange={e=>setTargetAmount(e.target.value)}
        />

        <label>Start Date</label>

        <input
          type="date"
          value={startDate}
          onChange={e=>setStartDate(e.target.value)}
        />

        <label>Deadline</label>

        <input
          type="date"
          value={deadline}
          onChange={e=>setDeadline(e.target.value)}
        />


        <label>Priority</label>

        <select
          value={priority}
          onChange={e=>setPriority(Number(e.target.value))}
        >
          <option value={1}>1 - Lowest</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
          <option value={5}>5 - Highest</option>
        </select>


        <Button
          text="Add Goal"
          onClick={addGoal}
        />

      </div>




      <table>

        <thead>
          <tr>
            <th>Priority</th>
            <th>Month</th>
            <th>Year</th>
            <th>Goal</th>
            <th>Start</th>
            <th>Deadline</th>
            <th>Monthly</th>
            <th>Total</th>
            <th>Progress</th>
            <th>Action</th>
          </tr>
        </thead>


        <tbody>

          {
            goals.map(goal=>(

              <tr key={goal.id}>

                <td>{"⭐".repeat(goal.priority)}</td>
                <td>{goal.month}</td>
                <td>{goal.year}</td>
                <td>{goal.name}</td>
                <td>{goal.startDate}</td>
                <td>{goal.deadline}</td>
                <td>RM {goal.monthlySaving}</td>
                <td>RM {goal.targetAmount}</td>

                <td>
                  <progress value={goal.progress} max="100"/>
                </td>

                <td>
                  <button onClick={()=>deleteGoal(goal.id)}>
                    Delete
                  </button>
                </td>

              </tr>

            ))
          }

        </tbody>

      </table>



      <Button
        text="Generate Allocation"
        onClick={generateAllocation}
      />



      <BudgetModal
        open={showBudgetModal}
        month={month}
        year={year}
        amount={Number(spareCash)}
        onClose={()=>setShowBudgetModal(false)}
      />


      <GoalModal
        open={showModal}
        status={allocationStatus}
        goals={unreachableGoals}
        onClose={()=>setShowModal(false)}
        onContinue={()=>{
          setShowModal(false);
          navigate("/allocation");
        }}
      />

    </div>
  );
}

export default DataInput;