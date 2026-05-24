import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { DecomposePromptApp } from './DecomposePromptApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in requirements-decompose panel');
}
ReactDOM.createRoot(rootEl).render(<DecomposePromptApp />);
