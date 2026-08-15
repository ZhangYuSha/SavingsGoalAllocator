import { useState } from 'react'

import type {
  AllocationResult,
  SystemAllocation,
} from '../types/Allocation'

/**
 * Display the result of the processed allocation logic (from other files).
 * Has 3 jobs:
 * 1. Display each goal with its detail
 * 2. Allow user to see the planning option generated
 * 3. Allow user to see the top 1 - 3 system planning combinations
 */

interface AllocationSummaryProps {

  /** Contains the allocation results / goal */
  results:
    AllocationResult[]

  /** Contains the alternative system recommendations (top 1 - 3) */
  systemAllocations:
    SystemAllocation[]

}

/**
 * Displays allocation results for each savings goal and allow user view planning options.
 * Displays top 1 - 3 system recommendations
 * @param results - allocation results generated per goal
 * @param systemAllocations - top 1 - 3 system recommendation
 * @returns allocation summary UI in web applications
 */
function AllocationSummary({
  results,
  systemAllocations,
}: AllocationSummaryProps) {

  /**
   * Store the planning option selected for every <goal />
   * 
   * Goal ID act as the key, the value will identified the selected allocation strategy.
   */
  const [
    selectedPlans,
    setSelectedPlans,
  ] = useState<
    Record<
      number,
      'immediate' | 'monthly'
    >
  >({})


  /**
   * No allocation result will trigger this approach.
   */
  if (
    results.length === 0
  ) {

    return (
      <p>
        No allocation results available.
      </p>
    )

  }

  /**
   * Render the allocation summary.
   */


  return (

    <div>

      {/* ================================================= */}
      {/* CURRENT ALLOCATION */}
      {/* ================================================= */}
      {/**
       * Display the allocation results for every goal with its detail.
       */}
      {results.map(result => {

        {
          /**
           * Retrieve the planning option selected by the user for this goal.
           * 
           * The goal ID act as an identifier because each goal could have different planning option.
           */
        }
        const selectedPlanType =
          selectedPlans[result.goalId]

        {
          /**
           * Find the complete allocation plan that matching with the planning option chosen.
           */
        }
        const selectedPlan =
          result.allocationPlans.find(
            plan =>
              plan.type ===
              selectedPlanType
          )


        return (

          
          <div
            className="allocation-card"
            key={result.goalId}
          >

            {/* GOAL INFORMATION */}

            <h2>
              {result.goalName}
            </h2>


            <p>

              Target:{' '}

              <strong>
                RM {result.targetAmount}
              </strong>

            </p>


            {/* PLANNING OPTIONS */}

            {/**
             * Display the available planning options only when at least 1 exist.
             */
              result.allocationPlans.length > 0 && (

                <div className="planning-options">

                  <h3>
                    Planning Options (Click the section to see the allocation)
                  </h3>


                  {/**
                   * Display each available planning option.
                   * Either an immediate funding or spreading the allocation across months.
                   */
                    result.allocationPlans.map(
                      plan => {

                        const isSelected =
                          selectedPlanType ===
                          plan.type


                        return (

                          <button
                            type="button"

                            /**
                             * Apply additional css for recommendation selected or when it is currently selected.
                             */
                            className={`planning-option ${
                              plan.recommended
                                ? 'recommended'
                                : ''
                            } ${
                              isSelected
                                ? 'selected'
                                : ''
                            }`}

                            key={plan.type}

                            /**
                             * Store the selected planning option for this goal.
                             * 
                             * The previous one are preserved, so selecting 1 goal not removing other goal selection.
                             */
                            onClick={() =>
                              setSelectedPlans(
                                previous => ({

                                  ...previous,

                                  [result.goalId]:
                                    plan.type,

                                })
                              )
                            }
                          >

                            <strong>

                              {
                                /**
                                 * State the plan approach.
                                 */
                                plan.recommended
                                  ? '(Standard Plan) '
                                  : '(Alternative) '
                              }


                              {
                                plan.type ===
                                'immediate'
                                  ? 'Fund immediately'
                                  : 'Spread monthly'
                              }

                            </strong>


                            <span>

                              {plan.description}

                            </span>

                          </button>

                        )

                      }
                    )
                  }


                  <p className="allocation-info">

                    Click a planning option
                    to view its allocation.

                  </p>

                </div>

              )
            }


            {/* SELECTED PLAN */}

            {/**
             * Display the details of the selected plan
             */
              selectedPlan && (

                <>

                  <p>

                    Total Allocated per month:{' '}

                    <strong>
                      RM {selectedPlan.amount}
                    </strong>

                  </p>


                  <p>

                    Progress per month:{' '}

                    <strong>

                      {
                    /*
                     * Calculate how much of the goal target
                     * is represented by the monthly allocation.
                     *
                     * Example:
                     * RM 500 / RM 3000 × 100 = 16.67%
                     *
                     * Math.round() removes decimal places.
                     * Math.min() prevents the result from
                     * exceeding 100%.
                     */
                        Math.min(
                          100,

                          Math.round(
                            (
                              selectedPlan.amount /
                              result.targetAmount
                            ) * 100
                          )
                        )
                      }%

                    </strong>

                  </p>


                  {/* MONTHLY ALLOCATION */}

                  {/**
                   * Display monthly allocation table only when a selected plan contains this clicked.
                   */
                    selectedPlan.monthlyAllocations
                      .length > 0 && (

                      <div
                        className="monthly-allocation"
                      >

                        <h3>
                          Monthly Allocation
                        </h3>


                        <table>

                          <thead>

                            <tr>

                              <th>
                                Month
                              </th>

                              <th>
                                Allocation
                              </th>

                            </tr>

                          </thead>


                          <tbody>

                            {/**
                             * Convert each monthly allocation to table row
                             */
                              selectedPlan
                                .monthlyAllocations
                                .map(
                                  allocation => (

                                    <tr
                                    /**
                                     * Create unique key using the goal, plan, year, and month.
                                     */
                                      key={
                                        `${result.goalId}-${selectedPlan.type}-${allocation.year}-${allocation.month}`
                                      }
                                    >

                                      <td>
                                        {
                                          allocation.monthName
                                        }
                                      </td>

                                      <td>
                                        RM {
                                          allocation.amount
                                        }
                                      </td>

                                    </tr>

                                  )
                                )
                            }

                          </tbody>

                        </table>

                      </div>

                    )
                  }


                  {/* EXPECTED COMPLETION */}

                  {/**
                   * If monthly allocation exist, final allocation month represents expected completion month of that plan.
                   */
                    selectedPlan
                      .monthlyAllocations
                      .length > 0 && (

                      <p>

                        Expected completion:{' '}

                        <strong>

                          {
                            selectedPlan
                              .monthlyAllocations[
                                selectedPlan
                                  .monthlyAllocations
                                  .length - 1
                              ]
                              .monthName
                          }

                        </strong>

                      </p>

                    )
                  }

                </>

              )
            }


            {/* STATUS */}

            {/**
             * Display the final reach status of the goal.
             */
              result.reachable ? (

                <p className="reachable">

                  ✅ Goal is reachable

                </p>

              ) : (

                <p className="unreachable">

                  ⚠️ Shortfall:{' '}

                  RM {result.shortfall}

                </p>

              )
            }

          </div>

        )

      })}


      {/* ================================================= */}
      {/* SYSTEM ALLOCATION */}
      {/* ================================================= */}

      {/*
        * Display system-generated allocation combinations
        * when >= one combination is available.
        *
        * TRepresent alternative ways of
        * allocating available budget across all goals.
        */
        systemAllocations.length > 0 && (

          <section className="system-allocation">

            <div className="system-allocation-header">

              <h2>
                System Allocation
              </h2>


              <p>
                Alternative allocation combinations
                generated from your goals, priorities,
                deadlines, and available budget.
              </p>

            </div>


            {/**
             * Display system top 3
             */
              systemAllocations.map(
                combination => (

                  <div
                    className="system-allocation-card"
                    key={
                      combination.rank
                    }
                  >

                    {/* TITLE */}

                    <div
                      className="system-allocation-title"
                    >

                      <div>

                        <h3>

                          {/**
                           * Display layout for the ranking title
                           */
                            combination.rank === 1
                              ? '🥇'
                              : combination.rank === 2
                                ? '🥈'
                                : '🥉'
                          }

                          {' '}

                          Top {combination.rank}

                          {' — '}

                          {combination.title}

                        </h3>

                      </div>


                      <div
                        className="system-allocation-score"
                      >

                        Score:{' '}

                        <strong>
                          {combination.score}
                        </strong>

                      </div>

                    </div>


                    {/* GOALS */}

                    <div
                      className="system-allocation-goals"
                    >

                      {/**
                       * Each system allocations contains multiple goals.
                       * Display allocation result.
                       */
                        combination.goals.map(
                          goal => (

                            <div
                              className="system-allocation-goal"
                              key={
                                goal.goalId
                              }
                            >

                              <h4>
                                {goal.goalName}
                              </h4>


                              <p>

                                Target:{' '}

                                <strong>
                                  RM {goal.targetAmount}
                                </strong>

                              </p>


                              <p>

                                Allocated:{' '}

                                <strong>
                                  RM {goal.totalAllocated}
                                </strong>

                              </p>


                              <p>

                                Progress:{' '}

                                <strong>
                                  {goal.percentage}%
                                </strong>

                              </p>


                              {/**
                               * Display monthly allocation table when it has monthly allocation entries.
                               */
                                goal.monthlyAllocations
                                  .length > 0 && (

                                  <div
                                    className="system-monthly-allocation"
                                  >

                                    <h5>
                                      Monthly Allocation
                                    </h5>


                                    <table>

                                      <thead>

                                        <tr>

                                          <th>
                                            Month
                                          </th>

                                          <th>
                                            Allocation
                                          </th>

                                        </tr>

                                      </thead>


                                      <tbody>

                                        {/**
                                         * Convert each monthly allocation to table row.
                                         */
                                          goal
                                            .monthlyAllocations
                                            .map(
                                              allocation => (

                                                <tr
                                                /**
                                                 * Include the combination rank and goal ID (uniqueness)
                                                 */
                                                  key={
                                                    `${combination.rank}-${goal.goalId}-${allocation.year}-${allocation.month}`
                                                  }
                                                >

                                                  <td>
                                                    {
                                                      allocation.monthName
                                                    }
                                                  </td>

                                                  <td>
                                                    RM {
                                                      allocation.amount
                                                    }
                                                  </td>

                                                </tr>

                                              )
                                            )
                                        }

                                      </tbody>

                                    </table>

                                  </div>

                                )
                              }


                              {/**
                               * State the reach tier of the goal.
                               */
                                goal.reachable ? (

                                  <p className="reachable">

                                    ✅ Reachable

                                  </p>

                                ) : (

                                  <p className="unreachable">

                                    ⚠️ Not fully funded

                                  </p>

                                )
                              }

                            </div>

                          )
                        )
                      }

                    </div>

                  </div>

                )
              )
            }

          </section>

        )
      }

    </div>

  )
}


export default AllocationSummary