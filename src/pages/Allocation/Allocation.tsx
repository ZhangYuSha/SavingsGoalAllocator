import './Allocation.css'
import Button from '../../component/Button'

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


/*
 * =================================================
 * LOCATION STATE
 * =================================================
 *
 * Defines the data that is passed to this page
 * when navigating from the DataInput page.
 *
 * goals:
 *     Contains all savings goals entered by the user.
 *
 * monthlyBudgets:
 *     Contains the available spare cash for each month.
 *
 * =================================================
 */

interface AllocationLocationState {

  goals:
    Goal[]

  monthlyBudgets:
    MonthlyBudget[]

}


/*
 * =================================================
 * ALLOCATION PAGE
 * =================================================
 *
 * This component is responsible for:
 *
 * 1. Reading the goals and budgets from navigation state.
 * 2. Generating the normal priority allocation.
 * 3. Generating alternative system allocation combinations.
 * 4. Calculating summary information.
 * 5. Displaying the allocation results.
 *
 * =================================================
 */

function Allocation() {

  /*
   * useLocation() gives access to the state that was
   * passed when navigating to this page.
   *
   * For example, DataInput can navigate here while
   * passing:
   *
   * {
   *   goals: [...],
   *   monthlyBudgets: [...]
   * }
   */

  const location =
    useLocation()


  /*
   * useNavigate() allows this page to navigate
   * the user back to the DataInput page.
   */

  const navigate =
    useNavigate()


  /*
   * Read the navigation state.
   *
   * The state may be undefined if the user opens
   * the Allocation page directly without first
   * entering any data.
   */

  const state =
    location.state as
      | AllocationLocationState
      | undefined


  /*
   * =================================================
   * NO DATA
   * =================================================
   *
   * If no navigation state exists, there are no goals
   * or budgets available for allocation.
   *
   * Instead of trying to generate an allocation from
   * missing data, show an empty-state message and
   * provide a button to return to DataInput.
   *
   * =================================================
   */

  if (!state) {

    return (

      <div className="allocation-page">

        /*
         * Button that sends the user back to the
         * DataInput page so they can create goals
         * and budgets.
         */

        <Button className="back-button" onClick={() => navigate('/DataInput')}>
          <span className="back-arrow">←</span>
          Back to Goals
        </Button>


        /*
         * Page heading shown when there is no
         * allocation data.
         */

        <h1>
          Allocation
        </h1>


        /*
         * Empty state shown when the page was opened
         * without any data being passed to it.
         */

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


          /*
           * Provides another way for the user to
           * return to the DataInput page.
           */

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
   *
   * The current/main allocation uses the
   * PriorityAllocationStrategy.
   *
   * This strategy gives higher-priority goals
   * money before lower-priority goals.
   *
   * The generated results are stored in "results".
   *
   * =================================================
   */

  const strategy =
    new PriorityAllocationStrategy()


  /*
   * generateAllocation() runs the selected allocation
   * strategy using:
   *
   * state.goals
   *     -> The user's savings goals.
   *
   * state.monthlyBudgets
   *     -> The user's available monthly budget.
   *
   * strategy
   *     -> The PriorityAllocationStrategy created above.
   */

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
   * generateSystemAllocation() generates several
   * alternative allocation combinations.
   *
   * These are independent from the normal priority
   * allocation above.
   *
   * The system considers different allocation modes,
   * such as:
   *
   * - Priority
   * - Balanced
   * - Deadline
   * - Target
   *
   * It then scores the generated candidates and
   * returns the best combinations.
   *
   * The result is used to display the Top 1,
   * Top 2 and Top 3 combinations.
   *
   * This does NOT replace the normal allocation.
   * It provides additional recommendations.
   *
   * =================================================
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
   *
   * The following values are used to display a quick
   * summary at the top of the page.
   *
   * =================================================
   */


  /*
   * Count how many goals were successfully funded.
   *
   * filter() keeps only results where reachable
   * is true.
   *
   * Example:
   *
   * Goal 1 -> reachable = true
   * Goal 2 -> reachable = false
   * Goal 3 -> reachable = true
   *
   * reachableCount = 2
   */

  const reachableCount =
    results.filter(
      result =>
        result.reachable
    ).length


  /*
   * Count the total number of goals.
   */

  const totalGoals =
    results.length


  /*
   * Calculate the total amount of budget available
   * across all months.
   *
   * Example:
   *
   * August  = RM500
   * September = RM700
   * October = RM300
   *
   * totalBudget = RM1500
   */

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
   *
   * Render the complete Allocation Results page.
   *
   * =================================================
   */

  return (

    <div className="allocation-page">

      {/* =================================================
       * BACK BUTTON
       * =================================================
       *
       * Returns the user to the DataInput page.
       * =================================================
       */}

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


      {/* =================================================
       * PAGE TITLE
       * =================================================
       *
       * Main heading for the allocation results page.
       * =================================================
       */}

      <h1>
        Allocation Results
      </h1>


      /*
       * Short explanation of what the page displays.
       */

      <p className="allocation-subtitle">

        Here's how your available spare
        cash is distributed across your
        savings goals.

      </p>


      {/* =================================================
       * OVERVIEW
       * =================================================
       *
       * Displays three high-level pieces of information:
       *
       * Goals:
       *     Total number of savings goals.
       *
       * Reachable:
       *     Number of goals that can reach their
       *     target based on the available budget.
       *
       * Planned Budget:
       *     Total amount of monthly budget entered.
       *
       * =================================================
       */}

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


      {/* =================================================
       * CURRENT + SYSTEM ALLOCATION
       * =================================================
       *
       * AllocationSummary receives both types of
       * allocation results:
       *
       * results:
       *     The normal PriorityAllocationStrategy result.
       *
       * systemAllocations:
       *     The alternative Top 1, Top 2 and Top 3
       *     system-generated combinations.
       *
       * AllocationSummary is responsible for displaying
       * these results to the user.
       *
       * =================================================
       */}

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


/*
 * =================================================
 * EXPORT
 * =================================================
 *
 * Makes the Allocation component available to the
 * React Router or other files that import this page.
 *
 * =================================================
 */

export default Allocation