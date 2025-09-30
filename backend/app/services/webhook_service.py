# backend/app/services/webhook_service.py
import requests
from typing import Dict, List
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class WebhookService:
    def __init__(self):
        self.shopify_url = f"https://{settings.SHOPIFY_STORE_URL}/admin/api/{settings.SHOPIFY_API_VERSION}"
        self.headers = {
            "X-Shopify-Access-Token": settings.SHOPIFY_ACCESS_TOKEN,
            "Content-Type": "application/json"
        }
    
    def create_webhook(self, topic: str, address: str) -> bool:
        """Create a webhook in Shopify"""
        webhook_data = {
            "webhook": {
                "topic": topic,
                "address": address,
                "format": "json"
            }
        }
        
        try:
            response = requests.post(
                f"{self.shopify_url}/webhooks.json",
                json=webhook_data,
                headers=self.headers
            )
            
            if response.status_code == 201:
                logger.info(f"Webhook created successfully for {topic}")
                return True
            else:
                logger.error(f"Failed to create webhook: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error creating webhook: {e}")
            return False
    
    def list_webhooks(self) -> List[Dict]:
        """List all existing webhooks"""
        try:
            response = requests.get(
                f"{self.shopify_url}/webhooks.json",
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json().get("webhooks", [])
            else:
                logger.error(f"Failed to list webhooks: {response.text}")
                return []
                
        except Exception as e:
            logger.error(f"Error listing webhooks: {e}")
            return []
    
    def delete_webhook(self, webhook_id: str) -> bool:
        """Delete a webhook"""
        try:
            response = requests.delete(
                f"{self.shopify_url}/webhooks/{webhook_id}.json",
                headers=self.headers
            )
            
            if response.status_code == 200:
                logger.info(f"Webhook {webhook_id} deleted successfully")
                return True
            else:
                logger.error(f"Failed to delete webhook: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting webhook: {e}")
            return False
    
    def setup_all_webhooks(self, base_url: str):
        """Setup all required webhooks"""
        webhook_topics = [
            "products/create",
            "products/update", 
            "products/delete",
            "orders/create",
            "orders/updated",
            "orders/cancelled",
            "orders/paid",
            "inventory_items/create",
            "inventory_items/update",
            "inventory_items/delete",
        ]
        
        for topic in webhook_topics:
            endpoint = topic.replace("/", "-")
            webhook_url = f"{base_url}/webhooks/{endpoint}"
            self.create_webhook(topic, webhook_url)
