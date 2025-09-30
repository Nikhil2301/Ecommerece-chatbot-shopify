# backend/app/services/data_sync.py
from typing import Dict, Optional
from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.product_image import ProductImage
from app.models.product_option import ProductOption
from app.models.product_option_value import ProductOptionValue
from app.models.product_variant import ProductVariant
from app.models.order import Order
from app.models.order_line_item import OrderLineItem
from app.models.line_item_price_set import LineItemPriceSet
from app.models.line_item_tax_line import LineItemTaxLine
from app.models.order_address import OrderAddress
from app.services.shopify_service import ShopifyService
from app.services.vector_service import VectorService
from datetime import datetime
from app.models.inventory_item import InventoryItem
import json
import logging
import os

logger = logging.getLogger(__name__)

LOG_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../data_sync.txt'))

class DataSyncService:
    def __init__(self):
        self.shopify_service = ShopifyService()
        self.vector_service = VectorService()

    def sync_products(self, db: Session) -> Dict[str, int]:
        """Sync products from Shopify to PostgreSQL and Qdrant"""
        stats = {"added": 0, "updated": 0, "errors": 0}
        
        try:
           # Delete everything in DB tables first
            db.query(ProductImage).delete()
            db.query(ProductOptionValue).delete()
            db.query(ProductOption).delete()
            db.query(ProductVariant).delete()
            db.query(Product).delete()
            db.commit()

            # Delete all from Qdrant vector DB with verification
            print("Deleting all products from vector database...")
            delete_success = self.vector_service.delete_all()
            if delete_success:
                print("Successfully cleared vector database")
            else:
                print("Warning: Failed to clear vector database completely")
            
            # Verify collection is empty
            collection_info = self.vector_service.get_collection_info()
            print(f"Collection info after deletion: {collection_info}")

            shopify_products = self.shopify_service.get_products()
            print(f"Fetched {len(shopify_products)} products from Shopify")
            
            # Log raw Shopify response
            print(f"Logging to: {LOG_PATH}")
            try:
                with open(LOG_PATH, "a") as log_file:
                    log_file.write(f"\n\n=== Full Product Sync @ {datetime.now().isoformat()} ===\n")
                    json.dump(shopify_products, log_file, indent=2, default=str)
                    log_file.write("\n")
            except Exception as log_e:
                print(f"Error logging Shopify data: {log_e}")
            
            for shopify_product in shopify_products:
                try:
                    self._process_single_product(db, shopify_product, stats)
                except Exception as e:
                    print(f"Error syncing product {shopify_product.get('id')}: {e}")
                    import traceback
                    traceback.print_exc()
                    stats["errors"] += 1
            
            db.commit()
            print(f"Product sync completed - PostgreSQL committed successfully")
            
        except Exception as e:
            print(f"Error in product sync: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            print("Product sync rolled back due to error")
        
        return stats

    async def sync_single_product(self, db: Session, shopify_product: Dict) -> bool:
        """Sync a single product from webhook data"""
        try:
            # Log webhook product data
            print(f"Logging to: {LOG_PATH}")
            try:
                with open(LOG_PATH, "a") as log_file:
                    log_file.write(f"\n\n=== Webhook Product Sync @ {datetime.now().isoformat()} ===\n")
                    log_file.write(f"Product ID: {shopify_product.get('id')}\n")
                    json.dump(shopify_product, log_file, indent=2, default=str)
                    log_file.write("\n")
            except Exception as log_e:
                print(f"Error logging webhook product data: {log_e}")

            stats = {"added": 0, "updated": 0, "errors": 0}
            self._process_single_product(db, shopify_product, stats)
            db.commit()
            logger.info(f"Single product sync completed: {stats}")
            return True
        except Exception as e:
            logger.error(f"Error syncing single product: {e}")
            db.rollback()
            return False

    def _process_single_product(self, db: Session, shopify_product: Dict, stats: Dict[str, int]):
        """Process a single product (used by both full sync and webhook sync)"""
        existing_product = db.query(Product).filter(
            Product.shopify_id == str(shopify_product["id"])
        ).first()
        main_variant = shopify_product.get("variants", [{}])[0]
        product_data = {
            "shopify_id": str(shopify_product["id"]),
            "title": shopify_product.get("title"),
            "description": shopify_product.get("body_html", ""),
            "price": float(main_variant.get("price", 0)),
            "compare_at_price": float(main_variant.get("compare_at_price")) if main_variant.get("compare_at_price") else None,
            "vendor": shopify_product.get("vendor"),
            "product_type": shopify_product.get("product_type"),
            "tags": shopify_product.get("tags"),
            "handle": shopify_product.get("handle"),
            "status": shopify_product.get("status", "active"),
            "shopify_created_at": self._parse_datetime(shopify_product.get("created_at")),
            "shopify_updated_at": self._parse_datetime(shopify_product.get("updated_at"))
        }
        if existing_product:
            for key, value in product_data.items():
                setattr(existing_product, key, value)
            product = existing_product
            stats["updated"] += 1
            db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
            db.query(ProductOptionValue).filter(ProductOptionValue.option_id.in_(
                db.query(ProductOption.id).filter(ProductOption.product_id == product.id)
            )).delete()
            db.query(ProductOption).filter(ProductOption.product_id == product.id).delete()
            db.query(ProductVariant).filter(ProductVariant.product_id == product.id).delete()
        else:
            product = Product(**product_data)
            db.add(product)
            db.flush()
            stats["added"] += 1
        for img_data in shopify_product.get("images", []):
            image = ProductImage(
                product_id=product.id,
                shopify_image_id=str(img_data.get("id")),
                src=img_data.get("src"),
                alt_text=img_data.get("alt"),
                position=img_data.get("position", 1),
                width=img_data.get("width"),
                height=img_data.get("height")
            )
            db.add(image)
        for opt_data in shopify_product.get("options", []):
            option = ProductOption(
                product_id=product.id,
                shopify_option_id=str(opt_data.get("id")),
                name=opt_data.get("name"),
                position=opt_data.get("position")
            )
            db.add(option)
            db.flush()
            for idx, value in enumerate(opt_data.get("values", [])):
                option_value = ProductOptionValue(
                    option_id=option.id,
                    value=value,
                    position=idx + 1
                )
                db.add(option_value)
        for var_data in shopify_product.get("variants", []):
            variant = ProductVariant(
                product_id=product.id,
                shopify_variant_id=str(var_data.get("id")),
                title=var_data.get("title"),
                price=float(var_data.get("price", 0)),
                compare_at_price=float(var_data.get("compare_at_price")) if var_data.get("compare_at_price") else None,
                position=var_data.get("position"),
                inventory_policy=var_data.get("inventory_policy", "deny"),
                option1=var_data.get("option1"),
                option2=var_data.get("option2"),
                option3=var_data.get("option3"),
                taxable=var_data.get("taxable", True),
                barcode=var_data.get("barcode"),
                fulfillment_service=var_data.get("fulfillment_service", "manual"),
                grams=var_data.get("grams"),
                inventory_management=var_data.get("inventory_management"),
                requires_shipping=var_data.get("requires_shipping", True),
                sku=var_data.get("sku"),
                weight=float(var_data.get("weight")) if var_data.get("weight") else None,
                weight_unit=var_data.get("weight_unit", "g"),
                inventory_item_id=str(var_data.get("inventory_item_id")) if var_data.get("inventory_item_id") else None,
                inventory_quantity=var_data.get("inventory_quantity", 0),
                old_inventory_quantity=var_data.get("old_inventory_quantity", 0),
                shopify_created_at=self._parse_datetime(var_data.get("created_at")),
                shopify_updated_at=self._parse_datetime(var_data.get("updated_at"))
            )
            db.add(variant)
        try:
            self.vector_service.add_product(shopify_product)
        except Exception as vector_e:
            print(f"Error adding product to vector DB: {vector_e}")

    async def delete_single_product(self, db: Session, shopify_id: str) -> bool:
        """Delete a single product"""
        try:
            product = db.query(Product).filter(Product.shopify_id == shopify_id).first()
            if product:
                # Delete related data first
                db.query(ProductImage).filter(ProductImage.product_id == product.id).delete()
                db.query(ProductOptionValue).filter(ProductOptionValue.option_id.in_(
                    db.query(ProductOption.id).filter(ProductOption.product_id == product.id)
                )).delete()
                db.query(ProductOption).filter(ProductOption.product_id == product.id).delete()
                db.query(ProductVariant).filter(ProductVariant.product_id == product.id).delete()
                
                # Delete main product
                db.delete(product)
                db.commit()
                
                logger.info(f"Product {shopify_id} deleted successfully")
                return True
            else:
                logger.warning(f"Product {shopify_id} not found for deletion")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting single product: {e}")
            db.rollback()
            return False

    def sync_orders(self, db: Session) -> Dict[str, int]:
        """Sync orders from Shopify to PostgreSQL"""
        stats = {"added": 0, "updated": 0, "errors": 0}
        
        try:
            # Delete all order data and related tables first
            db.query(LineItemTaxLine).delete()
            db.query(LineItemPriceSet).delete()
            db.query(OrderLineItem).delete()
            db.query(OrderAddress).delete()
            db.query(Order).delete()
            db.commit()

            shopify_orders = self.shopify_service.get_orders()
            print(f"Fetched {len(shopify_orders)} orders from Shopify")
            
            # Log raw Shopify response
            print(f"Logging to: {LOG_PATH}")
            try:
                with open(LOG_PATH, "a") as log_file:
                    log_file.write(f"\n\n=== Full Order Sync @ {datetime.now().isoformat()} ===\n")
                    json.dump(shopify_orders, log_file, indent=2, default=str)
                    log_file.write("\n")
            except Exception as log_e:
                print(f"Error logging Shopify order data: {log_e}")
            
            for shopify_order in shopify_orders:
                try:
                    self._process_single_order(db, shopify_order, stats)
                except Exception as e:
                    print(f"Error syncing order {shopify_order.get('id')}: {e}")
                    import traceback
                    traceback.print_exc()
                    stats["errors"] += 1
            
            db.commit()
            print(f"Order sync completed - PostgreSQL committed successfully")
            
        except Exception as e:
            print(f"Error in order sync: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            print("Order sync rolled back due to error")
        
        return stats

    async def sync_single_order(self, db: Session, shopify_order: Dict) -> bool:
        """Sync a single order from webhook data"""
        try:
            # Log webhook order data
            print(f"Logging to: {LOG_PATH}")
            try:
                log_path = os.path.join(os.path.dirname(__file__), '../data_sync.txt')
                with open(LOG_PATH, "a") as log_file:
                    log_file.write(f"\n\n=== Webhook Order Sync @ {datetime.now().isoformat()} ===\n")
                    log_file.write(f"Order ID: {shopify_order.get('id')}\n")
                    json.dump(shopify_order, log_file, indent=2, default=str)
                    log_file.write("\n")
            except Exception as log_e:
                print(f"Error logging webhook order data: {log_e}")

            stats = {"added": 0, "updated": 0, "errors": 0}
            self._process_single_order(db, shopify_order, stats)
            db.commit()
            
            logger.info(f"Single order sync completed: {stats}")
            return True
            
        except Exception as e:
            logger.error(f"Error syncing single order: {e}")
            db.rollback()
            return False

    def _process_single_order(self, db: Session, shopify_order: Dict, stats: Dict[str, int]):
        """Process a single order (used by both full sync and webhook sync)"""
        existing_order = db.query(Order).filter(
            Order.shopify_id == str(shopify_order["id"])
        ).first()
        
        order_data = {
            "shopify_id": str(shopify_order["id"]),
            "order_number": shopify_order.get("order_number"),
            "email": shopify_order.get("email"),
            "phone": shopify_order.get("phone"),
            "customer_id": str(shopify_order.get("customer", {}).get("id", "")) if shopify_order.get("customer") else "",
            "financial_status": shopify_order.get("financial_status"),
            "fulfillment_status": shopify_order.get("fulfillment_status"),
            "total_price": float(shopify_order.get("total_price", 0)),
            "subtotal_price": float(shopify_order.get("subtotal_price", 0)),
            "total_tax": float(shopify_order.get("total_tax", 0)),
            "total_discounts": float(shopify_order.get("total_discounts", 0)),
            "currency": shopify_order.get("currency"),
            "gateway": shopify_order.get("gateway"),
            "note": shopify_order.get("note"),
            "tags": shopify_order.get("tags"),
            "processed_at": self._parse_datetime(shopify_order.get("processed_at"))
        }
        
        if existing_order:
            # Update existing order
            for key, value in order_data.items():
                setattr(existing_order, key, value)
            order = existing_order
            stats["updated"] += 1
            
            # Clear existing related data
            db.query(LineItemTaxLine).filter(LineItemTaxLine.line_item_id.in_(
                db.query(OrderLineItem.id).filter(OrderLineItem.order_id == order.id)
            )).delete()
            db.query(LineItemPriceSet).filter(LineItemPriceSet.line_item_id.in_(
                db.query(OrderLineItem.id).filter(OrderLineItem.order_id == order.id)
            )).delete()
            db.query(OrderLineItem).filter(OrderLineItem.order_id == order.id).delete()
            db.query(OrderAddress).filter(OrderAddress.order_id == order.id).delete()
        else:
            # Create new order
            order = Order(**order_data)
            db.add(order)
            db.flush()  # Get the ID
            stats["added"] += 1
        
        # Add line items
        for item_data in shopify_order.get("line_items", []):
            line_item = OrderLineItem(
                order_id=order.id,
                shopify_line_item_id=str(item_data.get("id")),
                admin_graphql_api_id=item_data.get("admin_graphql_api_id"),
                current_quantity=item_data.get("current_quantity", 0),
                fulfillable_quantity=item_data.get("fulfillable_quantity", 0),
                fulfillment_service=item_data.get("fulfillment_service", "manual"),
                fulfillment_status=item_data.get("fulfillment_status"),
                gift_card=item_data.get("gift_card", False),
                grams=item_data.get("grams"),
                name=item_data.get("name", ""),
                price=float(item_data.get("price", 0)),
                product_exists=item_data.get("product_exists", True),
                product_id=str(item_data.get("product_id")) if item_data.get("product_id") else None,
                quantity=item_data.get("quantity", 0),
                requires_shipping=item_data.get("requires_shipping", True),
                sku=item_data.get("sku"),
                taxable=item_data.get("taxable", True),
                title=item_data.get("title"),
                total_discount=float(item_data.get("total_discount", 0)),
                variant_id=str(item_data.get("variant_id")) if item_data.get("variant_id") else None,
                variant_inventory_management=item_data.get("variant_inventory_management"),
                variant_title=item_data.get("variant_title"),
                vendor=item_data.get("vendor")
            )
            db.add(line_item)
            db.flush()  # Get the line item ID
            
            # Add price sets
            if "price_set" in item_data:
                price_set = LineItemPriceSet(
                    line_item_id=line_item.id,
                    type="price",
                    shop_money_amount=float(item_data["price_set"]["shop_money"]["amount"]),
                    shop_money_currency=item_data["price_set"]["shop_money"]["currency_code"],
                    presentment_money_amount=float(item_data["price_set"]["presentment_money"]["amount"]),
                    presentment_money_currency=item_data["price_set"]["presentment_money"]["currency_code"]
                )
                db.add(price_set)
            
            if "total_discount_set" in item_data:
                discount_set = LineItemPriceSet(
                    line_item_id=line_item.id,
                    type="total_discount",
                    shop_money_amount=float(item_data["total_discount_set"]["shop_money"]["amount"]),
                    shop_money_currency=item_data["total_discount_set"]["shop_money"]["currency_code"],
                    presentment_money_amount=float(item_data["total_discount_set"]["presentment_money"]["amount"]),
                    presentment_money_currency=item_data["total_discount_set"]["presentment_money"]["currency_code"]
                )
                db.add(discount_set)
            
            # Add tax lines
            for tax_data in item_data.get("tax_lines", []):
                tax_line = LineItemTaxLine(
                    line_item_id=line_item.id,
                    channel_liable=tax_data.get("channel_liable", False),
                    price=float(tax_data.get("price", 0)),
                    rate=float(tax_data.get("rate", 0)),
                    title=tax_data.get("title"),
                    shop_money_amount=float(tax_data["price_set"]["shop_money"]["amount"]) if "price_set" in tax_data else None,
                    shop_money_currency=tax_data["price_set"]["shop_money"]["currency_code"] if "price_set" in tax_data else None,
                    presentment_money_amount=float(tax_data["price_set"]["presentment_money"]["amount"]) if "price_set" in tax_data else None,
                    presentment_money_currency=tax_data["price_set"]["presentment_money"]["currency_code"] if "price_set" in tax_data else None
                )
                db.add(tax_line)
        
        # Add addresses
        if shopify_order.get("billing_address"):
            billing_addr = shopify_order["billing_address"]
            billing_address = OrderAddress(
                order_id=order.id,
                address_type="billing",
                first_name=billing_addr.get("first_name"),
                last_name=billing_addr.get("last_name"),
                company=billing_addr.get("company"),
                address1=billing_addr.get("address1"),
                address2=billing_addr.get("address2"),
                city=billing_addr.get("city"),
                province=billing_addr.get("province"),
                country=billing_addr.get("country"),
                zip=billing_addr.get("zip"),
                phone=billing_addr.get("phone"),
                name=billing_addr.get("name"),
                country_code=billing_addr.get("country_code"),
                province_code=billing_addr.get("province_code")
            )
            db.add(billing_address)
        
        if shopify_order.get("shipping_address"):
            shipping_addr = shopify_order["shipping_address"]
            shipping_address = OrderAddress(
                order_id=order.id,
                address_type="shipping",
                first_name=shipping_addr.get("first_name"),
                last_name=shipping_addr.get("last_name"),
                company=shipping_addr.get("company"),
                address1=shipping_addr.get("address1"),
                address2=shipping_addr.get("address2"),
                city=shipping_addr.get("city"),
                province=shipping_addr.get("province"),
                country=shipping_addr.get("country"),
                zip=shipping_addr.get("zip"),
                phone=shipping_addr.get("phone"),
                name=shipping_addr.get("name"),
                country_code=shipping_addr.get("country_code"),
                province_code=shipping_addr.get("province_code")
            )
            db.add(shipping_address)
 
    def sync_inventory_item(self, db: Session, data: dict) -> bool:
        """Sync inventory item to database with all fields"""
        try:
            item = (
                db.query(InventoryItem)
                .filter(InventoryItem.shopify_id == str(data["id"]))
                .first()
            )
            if not item:
                item = InventoryItem(shopify_id=str(data["id"]))
                db.add(item)

            # Map all fields
            item.sku = data.get("sku")
            item.requires_shipping = data.get("requires_shipping", False)
            item.tracked = data.get("tracked", True)
            item.cost = float(data.get("cost")) if data.get("cost") else None
            item.country_code_of_origin = data.get("country_code_of_origin")
            item.province_code_of_origin = data.get("province_code_of_origin")
            item.harmonized_system_code = data.get("harmonized_system_code")
            item.weight_value = float(data.get("weight_value")) if data.get("weight_value") else None
            item.weight_unit = data.get("weight_unit")

            # Use the defined helper method
            item.shopify_created_at = self._parse_datetime(data.get("created_at"))
            item.shopify_updated_at = self._parse_datetime(data.get("updated_at"))

            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error syncing inventory item {data.get('id')}: {e}")
            return False

    def delete_inventory_item(self, db: Session, inventory_item_id: str) -> bool:
        """Delete inventory item from database"""
        try:
            item = (
                db.query(InventoryItem)
                .filter(InventoryItem.shopify_id == inventory_item_id)
                .first()
            )
            if not item:
                return False
            db.delete(item)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting inventory item {inventory_item_id}: {e}")
            return False

    # Helper for parsing ISO datetimes
    def _parse_datetime(self, date_string: Optional[str]) -> Optional[datetime]:
        """Parse Shopify datetime string"""
        if not date_string:
            return None
        try:
            return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        except Exception:
            return None