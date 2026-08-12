import { useState } from 'react'

import type {
  AllocationResult,
} from '../types/Allocation'

interface AllocationSummaryProps {
  results: AllocationResult[]
}

function AllocationSummary({
  results,
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

            {/* ========================= */}
            {/* GOAL */}
            {/* ========================= */}

            <h2>
              {result.goalName}
            </h2>


            <p>

              Target:{' '}

              <strong>
                RM {result.targetAmount}
              </strong>

            </p>


            {/* ========================= */}
            {/* PLANNING OPTIONS */}
            {/* ========================= */}

            {
              result.allocationPlans.length > 0 && (

                <div className="planning-options">

                  <h3>
                    Planning Options
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
                                plan.recommended &&
                                '⭐ '
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


            {/* ========================= */}
            {/* SELECTED PLAN DETAILS */}
            {/* ========================= */}

            {
              selectedPlan && (

                <>

                  <p>

                    Total allocated:{' '}

                    <strong>
                      RM {selectedPlan.amount}
                    </strong>

                  </p>


                  <p>

                    Progress:{' '}

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


                  {/* ========================= */}
                  {/* MONTHLY ALLOCATION */}
                  {/* ========================= */}

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


                  {/* ========================= */}
                  {/* EXPECTED COMPLETION */}
                  {/* ========================= */}

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


            {/* ========================= */}
            {/* STATUS */}
            {/* ========================= */}

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

    </div>

  )
}

export default AllocationSummary