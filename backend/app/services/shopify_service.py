import requests
import json
from typing import List, Dict, Optional
from app.config import settings
from datetime import datetime, timedelta

class ShopifyService:
    def __init__(self):
        self.base_url = f"{settings.SHOPIFY_STORE_URL}/admin/api/{settings.SHOPIFY_API_VERSION}"
        self.headers = {
            'X-Shopify-Access-Token': settings.SHOPIFY_ACCESS_TOKEN,
            'Content-Type': 'application/json'
        }
    
    def get_products(self, limit: int = 250, since_id: Optional[str] = None) -> List[Dict]:
        """Fetch products from Shopify API"""
        url = f"{self.base_url}/products.json"
        params = {'limit': limit}
        
        if since_id:
            params['since_id'] = since_id
            
        all_products = []
        
        while True:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            products = data.get('products', [])
            if not products:
                break
                
            all_products.extend(products)
            
            # Check for pagination
            link_header = response.headers.get('Link')
            if not link_header or 'rel="next"' not in link_header:
                break
                
            # Extract next page URL
            next_url = self._extract_next_url(link_header)
            if next_url:
                url = next_url
                params = {}  # Reset params for next URL
            else:
                break
        
        return all_products
    
    def get_orders(self, limit: int = 250, since_id: Optional[str] = None, 
                   status: str = "any") -> List[Dict]:
        """Fetch orders from Shopify API"""
        url = f"{self.base_url}/orders.json"
        params = {
            'limit': limit,
            'status': status
        }
        
        if since_id:
            params['since_id'] = since_id
            
        all_orders = []
        
        while True:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            orders = data.get('orders', [])
            if not orders:
                break
                
            all_orders.extend(orders)
            
            # Check for pagination
            link_header = response.headers.get('Link')
            if not link_header or 'rel="next"' not in link_header:
                break
                
            # Extract next page URL
            next_url = self._extract_next_url(link_header)
            if next_url:
                url = next_url
                params = {}
            else:
                break
        
        return all_orders
    
    def get_order_by_id(self, order_id: str) -> Optional[Dict]:
        """Fetch specific order by ID"""
        url = f"{self.base_url}/orders/{order_id}.json"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            return data.get('order')
        except requests.exceptions.RequestException:
            return None
    
    def get_customer_orders(self, customer_id: str) -> List[Dict]:
        """Fetch orders for specific customer"""
        url = f"{self.base_url}/customers/{customer_id}/orders.json"
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            data = response.json()
            return data.get('orders', [])
        except requests.exceptions.RequestException:
            return []
    
    def _extract_next_url(self, link_header: str) -> Optional[str]:
        """Extract next page URL from Link header"""
        links = link_header.split(', ')
        for link in links:
            if 'rel="next"' in link:
                return link.split(';')[0].strip('<>')
        return None
    
    def create_webhook(self, topic: str, address: str) -> Dict:
        """Create a webhook subscription"""
        url = f"{self.base_url}/webhooks.json"
        webhook_data = {
            "webhook": {
                "topic": topic,
                "address": address,
                "format": "json"
            }
        }
        
        response = requests.post(url, headers=self.headers, json=webhook_data)
        response.raise_for_status()
        return response.json()
