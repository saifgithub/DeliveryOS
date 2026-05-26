import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { VerificationApp } from './VerificationApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in verification panel');
}
ReactDOM.createRoot(rootEl).render(<VerificationApp />);
