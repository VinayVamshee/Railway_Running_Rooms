import './index.css';
import Home from "./Components/Home";
import './Components/style.css';
import { ToastProvider } from './Components/common/Toast';

function App() {
  return (
    <ToastProvider>
      <Home />
    </ToastProvider>
  );
}

export default App;
