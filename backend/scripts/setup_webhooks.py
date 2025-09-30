# backend/scripts/setup_webhooks.py
import requests
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to the path to import from app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from app.config import settings
    print("✅ Settings loaded successfully")
    
    # Print available settings for debugging
    print("Available settings attributes:")
    for attr in dir(settings):
        if not attr.startswith('_') and attr.isupper():
            print(f"  - {attr}")
            
except Exception as e:
    print(f"❌ Error loading settings: {e}")
    sys.exit(1)

# Try to get Shopify configuration from different possible sources
def get_shopify_config():
    """Get Shopify configuration from settings or environment variables"""
    config = {}
    
    # Try to get from settings first
    shopify_attrs = {
        'SHOPIFY_SHOP_URL': ['SHOPIFY_SHOP_URL', 'SHOPIFY_STORE_URL', 'SHOPIFY_DOMAIN'],
        'SHOPIFY_ACCESS_TOKEN': ['SHOPIFY_ACCESS_TOKEN', 'SHOPIFY_API_KEY'],
        'SHOPIFY_API_VERSION': ['SHOPIFY_API_VERSION']
    }
    
    for key, possible_attrs in shopify_attrs.items():
        value = None
        
        # Try settings object first
        for attr in possible_attrs:
            if hasattr(settings, attr):
                value = getattr(settings, attr)
                break
        
        # Try environment variables if not found in settings
        if not value:
            for attr in possible_attrs:
                value = os.getenv(attr)
                if value:
                    break
        
        if value:
            config[key] = value
        else:
            print(f"❌ Could not find {key} in settings or environment variables")
            print(f"   Tried: {', '.join(possible_attrs)}")
    
    return config

WEBHOOK_TOPICS = [
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

def setup_webhooks(base_url: str):
    """Setup all Shopify webhooks"""
    config = get_shopify_config()
    
    if not all(key in config for key in ['SHOPIFY_SHOP_URL', 'SHOPIFY_ACCESS_TOKEN']):
        print("❌ Missing required Shopify configuration!")
        return False
    
    # Default API version if not specified
    api_version = config.get('SHOPIFY_API_VERSION', '2023-10')
    
    # Handle different URL formats
    shop_url = config['SHOPIFY_SHOP_URL']
    if not shop_url.startswith('http'):
        if '.myshopify.com' not in shop_url:
            shop_url = f"{shop_url}.myshopify.com"
        shop_url = f"https://{shop_url}"
    
    shopify_url = f"{shop_url}/admin/api/{api_version}"
    headers = {
        "X-Shopify-Access-Token": config['SHOPIFY_ACCESS_TOKEN'],
        "Content-Type": "application/json"
    }
    
    print(f"Setting up webhooks for: {base_url}")
    print(f"Shopify URL: {shopify_url}")
    
    for topic in WEBHOOK_TOPICS:
        endpoint = topic.replace("/", "-")
        webhook_url = f"{base_url}/api/v1/webhooks/{endpoint}"
        
        webhook_data = {
            "webhook": {
                "topic": topic,
                "address": webhook_url,
                "format": "json"
            }
        }
        
        try:
            response = requests.post(
                f"{shopify_url}/webhooks.json",
                json=webhook_data,
                headers=headers
            )
            
            if response.status_code == 201:
                webhook_info = response.json()['webhook']
                print(f"✅ Created webhook: {topic} -> {webhook_url} (ID: {webhook_info['id']})")
            else:
                print(f"❌ Failed to create webhook for {topic}: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Error creating webhook for {topic}: {e}")
    
    return True

def list_existing_webhooks():
    """List all existing webhooks"""
    config = get_shopify_config()
    
    if not all(key in config for key in ['SHOPIFY_SHOP_URL', 'SHOPIFY_ACCESS_TOKEN']):
        print("❌ Missing required Shopify configuration!")
        return False
    
    # Default API version if not specified
    api_version = config.get('SHOPIFY_API_VERSION', '2023-10')
    
    # Handle different URL formats
    shop_url = config['SHOPIFY_SHOP_URL']
    if not shop_url.startswith('http'):
        if '.myshopify.com' not in shop_url:
            shop_url = f"{shop_url}.myshopify.com"
        shop_url = f"https://{shop_url}"
    
    shopify_url = f"{shop_url}/admin/api/{api_version}"
    headers = {
        "X-Shopify-Access-Token": config['SHOPIFY_ACCESS_TOKEN'],
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{shopify_url}/webhooks.json", headers=headers)
        
        if response.status_code == 200:
            webhooks = response.json()['webhooks']
            print(f"\n📋 Existing webhooks ({len(webhooks)}):")
            for webhook in webhooks:
                print(f"  - {webhook['topic']} -> {webhook['address']} (ID: {webhook['id']})")
        else:
            print(f"❌ Failed to list webhooks: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error listing webhooks: {e}")
    
    return True

def delete_all_webhooks():
    """Delete all existing webhooks"""
    config = get_shopify_config()
    
    if not all(key in config for key in ['SHOPIFY_SHOP_URL', 'SHOPIFY_ACCESS_TOKEN']):
        print("❌ Missing required Shopify configuration!")
        return False
    
    # Default API version if not specified
    api_version = config.get('SHOPIFY_API_VERSION', '2023-10')
    
    # Handle different URL formats
    shop_url = config['SHOPIFY_SHOP_URL']
    if not shop_url.startswith('http'):
        if '.myshopify.com' not in shop_url:
            shop_url = f"{shop_url}.myshopify.com"
        shop_url = f"https://{shop_url}"
    
    shopify_url = f"{shop_url}/admin/api/{api_version}"
    headers = {
        "X-Shopify-Access-Token": config['SHOPIFY_ACCESS_TOKEN'],
        "Content-Type": "application/json"
    }
    
    try:
        # Get all webhooks first
        response = requests.get(f"{shopify_url}/webhooks.json", headers=headers)
        
        if response.status_code == 200:
            webhooks = response.json()['webhooks']
            print(f"\n🗑️  Deleting {len(webhooks)} existing webhooks...")
            
            for webhook in webhooks:
                delete_response = requests.delete(
                    f"{shopify_url}/webhooks/{webhook['id']}.json",
                    headers=headers
                )
                
                if delete_response.status_code == 200:
                    print(f"✅ Deleted webhook: {webhook['topic']} (ID: {webhook['id']})")
                else:
                    print(f"❌ Failed to delete webhook {webhook['id']}: {delete_response.text}")
        else:
            print(f"❌ Failed to list webhooks for deletion: {response.text}")
            
    except Exception as e:
        print(f"❌ Error deleting webhooks: {e}")
    
    return True

if __name__ == "__main__":
    print("=== Shopify Webhook Setup ===\n")
    
    # Show current configuration
    print("🔧 Checking Shopify configuration...")
    config = get_shopify_config()
    
    if not config:
        print("❌ No Shopify configuration found!")
        print("\nMake sure you have these environment variables set:")
        print("- SHOPIFY_SHOP_URL (your shop domain)")
        print("- SHOPIFY_ACCESS_TOKEN (your access token)")
        print("- SHOPIFY_API_VERSION (optional, defaults to 2023-10)")
        sys.exit(1)
    
    print("✅ Shopify configuration found:")
    for key, value in config.items():
        if 'TOKEN' in key:
            print(f"  - {key}: {'*' * (len(value) - 4) + value[-4:] if len(value) > 4 else '****'}")
        else:
            print(f"  - {key}: {value}")
    
    # Check command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'list':
            list_existing_webhooks()
        elif command == 'delete':
            delete_all_webhooks()
        elif command.startswith('http'):
            # It's a URL
            base_url = sys.argv[1].rstrip('/')
            print(f"\n🔧 Setting up webhooks...")
            setup_webhooks(base_url)
        else:
            print("❌ Invalid command!")
            print("Usage:")
            print("  python scripts/setup_webhooks.py <base_url>")
            print("  python scripts/setup_webhooks.py list")
            print("  python scripts/setup_webhooks.py delete")
    else:
        # Interactive mode
        print("\nWhat would you like to do?")
        print("1. List existing webhooks")
        print("2. Delete all webhooks")
        print("3. Setup new webhooks")
        
        choice = input("Enter choice (1-3): ").strip()
        
        if choice == '1':
            list_existing_webhooks()
        elif choice == '2':
            delete_all_webhooks()
        elif choice == '3':
            base_url = input("Enter your base URL (e.g., https://abc123.ngrok.io): ").strip().rstrip('/')
            if base_url:
                setup_webhooks(base_url)
            else:
                print("❌ No base URL provided!")
        else:
            print("❌ Invalid choice!")
    
    print(f"\n✅ Operation complete!")
