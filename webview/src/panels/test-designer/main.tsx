import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { TestDesignerApp } from './TestDesignerApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in test-designer panel');
}
ReactDOM.createRoot(rootEl).render(<TestDesignerApp />);
