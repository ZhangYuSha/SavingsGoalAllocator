import './HomeScreen.css'

import Button from '../../component/Button'

import { useNavigate } from 'react-router-dom'

/**
 * Displays the application's home screen.
 *
 * Provides the user with an introduction to the
 * Savings Goal Allocator and a button to create
 * a new savings goal.
 *
 * @returns The home screen component.
 */
function HomeScreen() {

  // Provides navigation between application routes.
  const navigate = useNavigate()

  return (
    <section id="center">

      <div>

        {/* Main application title. */}
        <h1>
          Savings Goal Allocator
        </h1>

        {/* Short description of the application. */}
        <p>
          Plan your savings for a better future.
        </p>

        {/* Navigates to the data input page
            when the user wants to create a goal. */}
        <Button
          text="Create Goal"
          onClick={() =>
            navigate('/DataInput')
          }
        />

      </div>

    </section>
  )
}

export default HomeScreen