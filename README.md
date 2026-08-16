# Savings Goal Allocator

A React and TypeScript web application that helps users plan and allocate their monthly savings across multiple financial goals.

The application allows users to define savings goals, set a monthly budget, and generate an allocation plan based on different allocation strategies. It also identifies goals that may not be reachable within their deadlines.

---

## Features

* Add and manage savings goals
* Set target amounts and deadlines
* Set a monthly savings budget
* Calculate required monthly savings
* Allocate available budget across multiple goals
* Prioritise goals based on allocation strategy
* Identify unreachable goals
* Generate alternative allocation plans
* Display allocation results clearly
* Automated unit testing for allocation logic

---

## Technologies

* **React** — User interface
* **TypeScript** — Type-safe application development
* **Vite** — Development and build tooling
* **Vitest** — Unit testing
* **CSS** — Application styling

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm

### Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd <project-directory>
npm install
```

### Run the Application

Start the development server:

```bash
npm run dev
```

The application will be available at the local URL provided by Vite.

### Run Tests

Run the test suite using:

```bash
npm test
```

---

# Application Workflow

```text
Add Savings Goals
        ↓
Set Monthly Budget
        ↓
Select Allocation Strategy
        ↓
Calculate Allocation
        ↓
Generate Allocation Plan
        ↓
Display Results
```

### 1. Add Savings Goals

Users can create savings goals by providing information such as:

* Goal name
* Target amount
* Current savings
* Deadline
* Priority

### 2. Set Monthly Budget

Users specify the amount of money available to allocate towards their savings goals each month.

### 3. Generate Allocation

The system calculates how the available monthly budget should be distributed between the goals.

### 4. View Results

The application displays the resulting allocation plan, including:

* Monthly allocation for each goal
* Goal completion information
* Reachable and unreachable goals
* Alternative allocation plans

---

# Project Architecture

The application separates user interface components from the core allocation logic.

```text
src/
├── component/
│   ├── Button/
│   ├── BudgetModal/
│   ├── GoalForm/
│   ├── GoalModal/
│   └── GoalTable/
│
├── pages/
│   └── DataInput/
│
├── logic/
│   ├── AllocationStrategy.ts
│   ├── PriorityAllocationStrategy.ts
│   ├── goalCalculator.ts
│   └── dateUtils.ts
│
├── types/
│   ├── goal.ts
│   ├── monthlyBudget.ts
│   └── Allocation.ts
│
└── tests/
```

### Separation of Responsibilities

* **React components** handle the user interface and user interactions.
* **Pages** coordinate different application screens.
* **Allocation strategies** contain the allocation algorithms.
* **Utility functions** contain reusable calculations and date-related operations.
* **Type definitions** describe the structure of application data.
* **Tests** verify the correctness of the core allocation logic.

---

# Design Patterns

## Strategy Pattern

The application uses the **Strategy Pattern** to separate allocation algorithms from the rest of the application.

The `AllocationStrategy` interface defines the common contract for allocation strategies.

```typescript
interface AllocationStrategy {
  allocate(
    goals: Goal[],
    budget: MonthlyBudget
  ): AllocationResult
}
```

A concrete strategy such as `PriorityAllocationStrategy` implements this interface.

```text
              AllocationStrategy
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   Priority      Balanced      Deadline
   Strategy      Strategy      Strategy
```

### Benefits

* Separates allocation algorithms from application logic
* Allows new allocation strategies to be added
* Reduces coupling between components and allocation algorithms
* Makes individual strategies easier to test
* Improves maintainability and extensibility

---

# SOLID Principles

## S — Single Responsibility Principle

* `PriorityAllocationStrategy` is responsible for priority-based allocation.
* `generateSystemAllocation` is responsible for generating and ranking alternative allocation combinations.
* Helper functions such as `sortGoals()`, `calculateAllocation()`, `calculateScore()`, and `removeDuplicates()` handle specific pieces of logic.

## O — Open/Closed Principle

* `AllocationStrategy` provides an abstraction for allocation strategies.
* New allocation strategies can implement the existing interface without modifying the strategy contract.
* `AllocationMode` supports different allocation behaviours such as `priority`, `balanced`, `deadline`, and `target`.

## L — Liskov Substitution Principle

* `PriorityAllocationStrategy` implements `AllocationStrategy`.
* Any component expecting an `AllocationStrategy` can use `PriorityAllocationStrategy` without changing its expected behaviour.
* Other allocation strategy implementations can similarly be substituted.

## I — Interface Segregation Principle

* `AllocationStrategy` is a focused interface containing the functionality required by allocation strategies.
* Implementations are not required to depend on unrelated methods.

## D — Dependency Inversion Principle

* The allocation architecture uses the `AllocationStrategy` abstraction rather than coupling consumers directly to a concrete strategy.
* This allows allocation strategies to be extended or replaced independently.

---

# Core Allocation Logic

## Monthly Saving Calculation

The application calculates the amount that needs to be saved each month based on the remaining amount and remaining time until the deadline.

```text
Required Monthly Saving
        =
Remaining Amount
        ÷
Remaining Months
```

## Priority Allocation

The priority allocation strategy:

1. Validates the provided goals and budget.
2. Calculates the required monthly saving for each goal.
3. Sorts goals according to their priority.
4. Allocates the available monthly budget.
5. Determines whether goals are reachable.
6. Produces the final allocation result.

## Alternative Allocation

The system can generate and evaluate alternative allocation combinations.

This process involves:

* Sorting goals
* Calculating allocations
* Calculating allocation scores
* Ranking possible allocations
* Removing duplicate allocation plans

---

# Testing

The project uses **Vitest** for automated unit testing.

## Test Scenarios

The test suite covers scenarios including:

* Empty input
* Single goal
* Multiple goals
* Different goal priorities
* Insufficient monthly budget
* Fully funded goals
* Unreachable goals
* Multiple allocation scenarios
* Edge cases

### Running Tests

```bash
npm test
```

---

# Code Quality

The project focuses on:

* TypeScript type safety
* Separation of concerns
* Modular architecture
* Reusable functions
* Clear naming
* Automated testing
* SOLID principles
* Strategy Pattern
* Maintainable code structure

---

# User Interface

## Home Screen

Briefly introduces the application and allows the user to begin creating their savings plan.

## Goal Input

Allows users to create and manage their savings goals.

## Budget Input

Allows users to specify their available monthly savings budget.

## Allocation Results

Displays the generated allocation plan and the status of each savings goal.

## Screenshots

Add screenshots of the application here.

```markdown
![Home Screen](path/to/home-screen.png)

![Goal Input](path/to/goal-input.png)

![Allocation Results](path/to/allocation-results.png)
```

---

# Example

## Input

```text
Monthly Budget: RM 1,000

Goal 1
Target: RM 3,000
Current Savings: RM 500
Priority: High

Goal 2
Target: RM 5,000
Current Savings: RM 1,000
Priority: Medium
```

## Output

```text
Goal 1: RM XXX/month
Goal 2: RM XXX/month

Goal 1: Reachable
Goal 2: Reachable / Unreachable
```

---

# Limitations

* Add known limitations of the current implementation.
* Document any assumptions made by the allocation algorithm.
* Mention features that are outside the current project scope.

---

# Future Improvements

Potential future improvements include:

* Additional allocation strategies
* Persistent data storage
* User authentication
* Historical savings tracking
* More advanced optimisation algorithms
* Data visualisation
* Exporting allocation plans
* Mobile support

---

# Development Decisions

## Why TypeScript?

TypeScript provides static type checking, making the application's data structures and function contracts more explicit and reducing potential runtime errors.

## Why the Strategy Pattern?

The Strategy Pattern allows different allocation algorithms to be separated from the rest of the application. This makes the allocation system easier to extend and test.

## Why Unit Testing?

The allocation logic contains important calculations and decision-making. Automated tests help verify that these calculations produce the expected results across normal and edge-case scenarios.

## Why Separate Business Logic from the UI?

Keeping allocation logic separate from React components makes the business logic easier to test, reuse, and maintain without depending on the user interface.

---

## Link to deployment
* savings-goal-allocator.vercel.app 
* savings-goal-allocator-2xp4wo8xi-isabella24.vercel.app 

