"""
Tests for OpenAI service, focusing on dynamic product option extraction.
"""

import pytest
from app.services.openai_service import OpenAIService


class TestExtractProductOptions:
    """Test suite for extract_product_options to ensure production resilience."""

    @pytest.fixture
    def service(self):
        """Create OpenAI service instance."""
        return OpenAIService()

    def test_extract_options_with_standard_structure(self, service):
        """Test with standard Shopify product structure."""
        product = {
            'options': [
                {'name': 'Color', 'values': ['Red', 'Blue', 'Green']},
                {'name': 'Size', 'values': ['S', 'M', 'L', 'XL']}
            ],
            'variants': [
                {'title': 'Red / S', 'option1': 'Red', 'option2': 'S', 'inventory_quantity': 10, 'sku': 'RS-001'},
                {'title': 'Red / M', 'option1': 'Red', 'option2': 'M', 'inventory_quantity': 5, 'sku': 'RM-001'},
                {'title': 'Blue / L', 'option1': 'Blue', 'option2': 'L', 'inventory_quantity': 0, 'sku': 'BL-001'},
            ]
        }

        result = service.extract_product_options(product)

        assert 'options' in result
        assert 'Color' in result['options']
        assert 'Size' in result['options']
        assert set(result['options']['Color']) == {'Red', 'Blue', 'Green'}
        assert set(result['options']['Size']) == {'S', 'M', 'L', 'XL'}
        
        # Check convenience keys
        assert set(result['colors']) == {'Red', 'Blue', 'Green'}
        assert set(result['sizes']) == {'S', 'M', 'L', 'XL'}
        
        # Check stock status
        assert len(result['stock_status']) == 3
        assert result['stock_status'][0]['available'] is True
        assert result['stock_status'][2]['available'] is False

    def test_extract_options_with_dict_values(self, service):
        """Test with option values as dict objects (alternative Shopify format)."""
        product = {
            'options': [
                {'name': 'Material', 'values': [{'value': 'Cotton'}, {'value': 'Polyester'}]},
            ],
            'variants': [
                {'title': 'Cotton', 'option1': 'Cotton', 'inventory_quantity': 20},
            ]
        }

        result = service.extract_product_options(product)

        assert 'Material' in result['options']
        assert set(result['options']['Material']) == {'Cotton', 'Polyester'}
        assert 'Cotton' in result['fabrics']

    def test_extract_options_missing_options_field(self, service):
        """Test graceful handling when options field is missing but variants exist."""
        product = {
            'variants': [
                {'title': 'Default', 'option1': 'Red', 'option2': 'Large', 'inventory_quantity': 15},
                {'title': 'Variant 2', 'option1': 'Blue', 'option2': 'Small', 'inventory_quantity': 8},
            ]
        }

        result = service.extract_product_options(product)

        # Should still extract from variants
        assert len(result['stock_status']) == 2
        assert result['stock_status'][0]['inventory_quantity'] == 15

    def test_extract_options_empty_product(self, service):
        """Test with empty or minimal product data."""
        product = {}

        result = service.extract_product_options(product)

        assert result['options'] == {}
        assert result['colors'] == []
        assert result['sizes'] == []
        assert result['stock_status'] == []

    def test_extract_options_with_age_group(self, service):
        """Test extraction of age group options."""
        product = {
            'options': [
                {'name': 'Age Group', 'values': ['Kids', 'Adults']},
            ],
            'variants': [
                {'title': 'Kids', 'option1': 'Kids', 'inventory_quantity': 30},
            ]
        }

        result = service.extract_product_options(product)

        assert 'Age Group' in result['options']
        assert set(result['age_groups']) == {'Kids', 'Adults'}

    def test_extract_options_with_three_options(self, service):
        """Test product with three option dimensions (option1, option2, option3)."""
        product = {
            'options': [
                {'name': 'Color', 'values': ['Black', 'White']},
                {'name': 'Size', 'values': ['M', 'L']},
                {'name': 'Style', 'values': ['Classic', 'Modern']}
            ],
            'variants': [
                {'title': 'Black / M / Classic', 'option1': 'Black', 'option2': 'M', 'option3': 'Classic', 'inventory_quantity': 5},
                {'title': 'White / L / Modern', 'option1': 'White', 'option2': 'L', 'option3': 'Modern', 'inventory_quantity': 12},
            ]
        }

        result = service.extract_product_options(product)

        assert 'Color' in result['options']
        assert 'Size' in result['options']
        assert 'Style' in result['options']
        assert len(result['option_names']) == 3
        
        # Check that variant attributes are mapped correctly
        assert result['stock_status'][0]['attributes']['Color'] == 'Black'
        assert result['stock_status'][0]['attributes']['Size'] == 'M'
        assert result['stock_status'][0]['attributes']['Style'] == 'Classic'

    def test_extract_options_case_insensitive_matching(self, service):
        """Test that color/size matching is case-insensitive."""
        product = {
            'options': [
                {'name': 'COLOUR', 'values': ['Red']},  # British spelling, uppercase
                {'name': 'size', 'values': ['Small']},  # lowercase
            ],
            'variants': []
        }

        result = service.extract_product_options(product)

        # Should match despite case differences
        assert 'Red' in result['colors']
        assert 'Small' in result['sizes']

    def test_extract_options_with_null_values(self, service):
        """Test handling of null/None values in options and variants."""
        product = {
            'options': [
                {'name': 'Color', 'values': ['Red', None, 'Blue']},
            ],
            'variants': [
                {'title': 'Red', 'option1': 'Red', 'option2': None, 'option3': None, 'inventory_quantity': 10},
            ]
        }

        result = service.extract_product_options(product)

        # Should filter out None values
        assert None not in result['options']['Color']
        assert set(result['options']['Color']) == {'Red', 'Blue'}

    def test_extract_options_preserves_order(self, service):
        """Test that option order is preserved for variant mapping."""
        product = {
            'options': [
                {'name': 'Size', 'values': ['S', 'M']},
                {'name': 'Color', 'values': ['Red', 'Blue']},
            ],
            'variants': [
                {'title': 'S / Red', 'option1': 'S', 'option2': 'Red', 'inventory_quantity': 5},
            ]
        }

        result = service.extract_product_options(product)

        # option_names should preserve order
        assert result['option_names'] == ['Size', 'Color']
        
        # Variant attributes should map correctly based on order
        assert result['stock_status'][0]['attributes']['Size'] == 'S'
        assert result['stock_status'][0]['attributes']['Color'] == 'Red'


class TestGenerateProductSpecificResponse:
    """Test product-specific response generation."""

    @pytest.fixture
    def service(self):
        return OpenAIService()

    def test_image_request_direct_response(self, service):
        """Test that image requests return URLs without API call."""
        product = {
            'title': 'Test Product',
            'shopify_id': '123',
            'price': '29.99',
            'images': [
                {'src': 'https://example.com/image1.jpg'},
                {'src': 'https://example.com/image2.jpg'},
            ]
        }

        response = service.generate_product_specific_response(product, "show me images", "images")

        assert 'Test Product' in response
        assert 'https://example.com/image1.jpg' in response
        assert 'https://example.com/image2.jpg' in response
        assert 'Image 1' in response
        assert 'Image 2' in response

    def test_no_images_available(self, service):
        """Test response when no images are available."""
        product = {
            'title': 'Test Product',
            'shopify_id': '123',
            'price': '29.99',
            'images': []
        }

        response = service.generate_product_specific_response(product, "show me images", "images")

        assert "don't have any images" in response.lower()
        assert 'Test Product' in response


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
