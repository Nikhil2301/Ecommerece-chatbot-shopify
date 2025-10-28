import { useState, useEffect } from 'react';
import axios from 'axios';

export default function WebhookAdmin({ shopDomain }: { shopDomain: string }) {
  const [webhooks, setWebhooks] = useState([]);
  const [topic, setTopic] = useState('products/create');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWebhooks();
  }, []);

  async function fetchWebhooks() {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/webhooks?shop_domain=${shopDomain}`);
      setWebhooks(res.data.webhooks || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function createWebhook() {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/webhooks', { shop_domain: shopDomain, topic, address });
      fetchWebhooks();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function deleteWebhook(id: number) {
    setLoading(true);
    setError('');
    try {
      await axios.delete(`/api/webhooks/${id}?shop_domain=${shopDomain}`);
      fetchWebhooks();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Shopify Webhook Management</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Webhook Topic</label>
        <input value={topic} onChange={e => setTopic(e.target.value)} className="border p-2 rounded w-full" />
        <label className="block mt-2 mb-1 font-medium">Webhook Address</label>
        <input value={address} onChange={e => setAddress(e.target.value)} className="border p-2 rounded w-full" />
        <button onClick={createWebhook} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Add Webhook</button>
      </div>
      <h3 className="font-semibold mb-2">Existing Webhooks</h3>
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-2">
          {webhooks.map((wh: any) => (
            <li key={wh.id} className="flex justify-between items-center border p-2 rounded">
              <span>{wh.topic} → {wh.address}</span>
              <button onClick={() => deleteWebhook(wh.id)} className="text-red-500">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
