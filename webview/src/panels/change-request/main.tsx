import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { ChangeRequestApp } from './ChangeRequestApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in change-request panel');
}
ReactDOM.createRoot(rootEl).render(<ChangeRequestApp />);
