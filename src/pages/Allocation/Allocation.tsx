import './Allocation.css'

import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import type { Goal } from '../../types/goal'

import type { MonthlyBudget } from '../../types/monthlyBudget'

import type {
  AllocationResult,
} from '../../types/Allocation'


import {
  generateAllocation,
} from '../../logic/allocationEngine'


import {
  generateSystemAllocation,
} from '../../logic/SystemAllocation'


import {
  PriorityAllocationStrategy,
} from '../../logic/PriorityAllocationStrategy'


import AllocationSummary from '../../component/AllocationSummary'


interface AllocationLocationState {

  goals:
    Goal[]

  monthlyBudgets:
    MonthlyBudget[]

}


function Allocation() {

  const location =
    useLocation()


  const navigate =
    useNavigate()


  const state =
    location.state as
      | AllocationLocationState
      | undefined


  /*
   * =================================================
   * NO DATA
   * =================================================
   */

  if (!state) {

    return (

      <div className="allocation-page">

        <button
          className="back-button"

          onClick={() =>
            navigate(
              '/DataInput'
            )
          }
        >

          <span className="back-arrow">
            ←
          </span>

          Back to Goals

        </button>


        <h1>
          Allocation
        </h1>


        <div className="empty-state">

          <div className="empty-icon">
            📊
          </div>


          <h2>
            No allocation data available
          </h2>


          <p>
            Create some savings goals and
            monthly budgets first.
          </p>


          <button
            className="primary-navigation-button"

            onClick={() =>
              navigate(
                '/DataInput'
              )
            }
          >

            Set Up Goals

          </button>

        </div>

      </div>

    )

  }


  /*
   * =================================================
   * CURRENT ALLOCATION
   * =================================================
   */

  const strategy =
    new PriorityAllocationStrategy()


  const results:
    AllocationResult[] =

    generateAllocation(
      state.goals,
      state.monthlyBudgets,
      strategy
    )


  /*
   * =================================================
   * SYSTEM ALLOCATION
   * =================================================
   *
   * This does NOT replace the current
   * allocation.
   *
   * It generates additional Top 1,
   * Top 2 and Top 3 combinations.
   */

  const systemAllocations =
    generateSystemAllocation(
      state.goals,
      state.monthlyBudgets
    )


  /*
   * =================================================
   * OVERVIEW
   * =================================================
   */

  const reachableCount =
    results.filter(
      result =>
        result.reachable
    ).length


  const totalGoals =
    results.length


  const totalBudget =
    state.monthlyBudgets.reduce(
      (sum, budget) =>
        sum +
        budget.amount,

      0
    )


  /*
   * =================================================
   * PAGE
   * =================================================
   */

  return (

    <div className="allocation-page">

      {/* BACK */}

      <button
        className="back-button"

        onClick={() =>
          navigate(
            '/DataInput'
          )
        }
      >

        <span className="back-arrow">
          ←
        </span>

        Back to Goals

      </button>


      {/* TITLE */}

      <h1>
        Allocation Results
      </h1>


      <p className="allocation-subtitle">

        Here's how your available spare
        cash is distributed across your
        savings goals.

      </p>


      {/* OVERVIEW */}

      <div className="allocation-overview">

        <div>

          <strong>
            Goals
          </strong>

          <span>
            {totalGoals}
          </span>

        </div>


        <div>

          <strong>
            Reachable
          </strong>

          <span>
            {reachableCount}
          </span>

        </div>


        <div>

          <strong>
            Planned Budget
          </strong>

          <span>
            RM {totalBudget}
          </span>

        </div>

      </div>


      {/* ================================================= */}
      {/* CURRENT + SYSTEM ALLOCATION */}
      {/* ================================================= */}

      <AllocationSummary

        results={
          results
        }

        systemAllocations={
          systemAllocations
        }

      />

    </div>

  )
}


export default Allocation