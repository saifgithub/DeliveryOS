import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { RequirementsApp } from './RequirementsApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in requirements panel');
}
ReactDOM.createRoot(rootEl).render(<RequirementsApp />);
