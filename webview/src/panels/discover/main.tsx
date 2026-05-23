import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { DiscoverApp } from './DiscoverApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in discover panel');
}
ReactDOM.createRoot(rootEl).render(<DiscoverApp />);
