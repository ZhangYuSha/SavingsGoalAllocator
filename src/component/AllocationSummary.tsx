import { useState } from 'react'

import type {
  AllocationResult,
  SystemAllocation,
} from '../types/Allocation'


interface AllocationSummaryProps {

  results:
    AllocationResult[]

  systemAllocations:
    SystemAllocation[]

}


function AllocationSummary({
  results,
  systemAllocations,
}: AllocationSummaryProps) {

  const [
    selectedPlans,
    setSelectedPlans,
  ] = useState<
    Record<
      number,
      'immediate' | 'monthly'
    >
  >({})


  if (
    results.length === 0
  ) {

    return (
      <p>
        No allocation results available.
      </p>
    )

  }


  return (

    <div>

      {/* ================================================= */}
      {/* CURRENT ALLOCATION */}
      {/* ================================================= */}

      {results.map(result => {

        const selectedPlanType =
          selectedPlans[result.goalId]


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

            {/* GOAL */}

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

            {
              result.allocationPlans.length > 0 && (

                <div className="planning-options">

                  <h3>
                    Planning Options (Click the section to see the allocation)
                  </h3>


                  {
                    result.allocationPlans.map(
                      plan => {

                        const isSelected =
                          selectedPlanType ===
                          plan.type


                        return (

                          <button
                            type="button"

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
                                plan.recommended
                                  ? '(⭐ Recommended) '
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

            {
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

                  {
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

                            {
                              selectedPlan
                                .monthlyAllocations
                                .map(
                                  allocation => (

                                    <tr
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

                  {
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

            {
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

      {
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


            {
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

                          {
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

                      {
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


                              {
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

                                        {
                                          goal
                                            .monthlyAllocations
                                            .map(
                                              allocation => (

                                                <tr
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


                              {
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