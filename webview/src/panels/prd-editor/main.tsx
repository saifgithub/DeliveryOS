import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { PrdEditorApp } from './PrdEditorApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in prd-editor panel');
}
ReactDOM.createRoot(rootEl).render(<PrdEditorApp />);
