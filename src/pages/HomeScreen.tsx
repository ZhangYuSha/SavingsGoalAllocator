import './HomeScreen.css'
import Button from '../component/Button.tsx'

function HomeScreen() {

  return (
    <>
      <section id="center">
        <div className="Savings Goal Allocator">
        </div>
        <div>
          <h1>Savings Goal Allocator</h1>
          <p>
            Plan your savings for the better future
          </p>
          <Button text="Create Goal" />
        </div>
      </section>
    </>
  )
}

export default HomeScreen
