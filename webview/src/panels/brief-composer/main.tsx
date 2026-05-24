import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { BriefComposerApp } from './BriefComposerApp';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in brief-composer panel');
}
ReactDOM.createRoot(rootEl).render(<BriefComposerApp />);
