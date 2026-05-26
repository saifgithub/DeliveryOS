import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { DiffResultsApp } from './DiffResultsApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in diff-results panel');
}
ReactDOM.createRoot(rootEl).render(<DiffResultsApp />);
