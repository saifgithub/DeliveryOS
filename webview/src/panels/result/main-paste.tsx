import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { PasteFallback } from './PasteFallback';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in result-paste panel');
}

ReactDOM.createRoot(rootEl).render(<PasteFallback />);
