import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { BugApp } from './BugApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in bug panel');
}
ReactDOM.createRoot(rootEl).render(<BugApp />);
