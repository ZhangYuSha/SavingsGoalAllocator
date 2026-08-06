import './DataInput.css'
import Button from '../../component/Button.tsx'

function DataInput() {

  return (
    <>
      <section id="center">
        <div className="Test Goal Allocator">
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

export default DataInput
