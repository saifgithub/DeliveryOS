import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { HelloApp } from './HelloApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in hello panel');
}
ReactDOM.createRoot(rootEl).render(<HelloApp />);
