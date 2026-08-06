import './HomeScreen.css'
import Button from '../../component/Button.tsx'
import { useNavigate } from 'react-router-dom';

function HomeScreen() {
  const navigate = useNavigate();

  const handleNavigation = (): void => {
    navigate('/DataInput'); 
  };

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
          <Button text="Create Goal" onClick={handleNavigation} />
        </div>
      </section>
    </>
  )
}

export default HomeScreen
