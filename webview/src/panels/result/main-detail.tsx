import ReactDOM from 'react-dom/client';
import '../../shared/styles/tailwind.css';
import { ResultDetail } from './ResultDetail';
import type { StoredResultPayload } from '@deliveryos/contracts';

// The result detail panel receives the resultId and payload via a data attribute
// written by the host, or falls back to a placeholder.
const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('DeliveryOS: missing #root element in result-detail panel');
}

// For now render a placeholder; the host will send result.show to update.
const resultId = (window as unknown as Record<string, unknown>).__DELIVERYOS_RESULT_ID as string | undefined ?? '';
const payload = (window as unknown as Record<string, unknown>).__DELIVERYOS_RESULT_PAYLOAD as StoredResultPayload | undefined;

if (payload && resultId) {
  ReactDOM.createRoot(rootEl).render(<ResultDetail resultId={resultId} payload={payload} />);
} else {
  ReactDOM.createRoot(rootEl).render(
    <div style={{ padding: 16 }}>
      <p>Loading result…</p>
    </div>,
  );
}
