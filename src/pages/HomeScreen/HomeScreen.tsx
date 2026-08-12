import './HomeScreen.css'

import Button from '../../component/Button'

import { useNavigate } from 'react-router-dom'

function HomeScreen() {

  const navigate = useNavigate()

  return (
    <section id="center">

      <div>

        <h1>
          Savings Goal Allocator
        </h1>

        <p>
          Plan your savings for a better future.
        </p>

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