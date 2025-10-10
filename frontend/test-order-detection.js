// Test script to verify order detection patterns
// Run this in browser console to test the patterns

function testOrderDetection() {
  // Order detection patterns from the code
  const orderRelatedPatterns = [
    // Direct order requests
    '\\\\b(?:order|orders)\\\\s+(?:details?|info|information|status)\\\\b',
    '\\\\b(?:give|show|tell)\\\\s+me.{0,20}\\\\border',
    '\\\\b(?:my|the)\\\\s+order',
    '\\\\border\\\\s+(?:number|#)\\\\s*\\\\d+',
    // Tracking related
    '\\\\b(?:track|tracking)\\\\b',
    '\\\\b(?:shipping|delivery)\\\\s+(?:status|info|details?)',
    '\\\\bwhere\\\\s+is\\\\s+my',
    '\\\\bwhen\\\\s+will\\\\s+(?:it|my\\\\s+order)',
    // Status inquiries
    '\\\\b(?:order|shipping|delivery)\\\\s+status\\\\b',
    '\\\\bstatus\\\\s+of\\\\s+(?:my\\\\s+)?order\\\\b',
  ];

  // Test cases
  const testMessages = [
    "please give me order details",
    "give me order details", 
    "show me order information",
    "tell me about my order",
    "order details please",
    "what is my order status",
    "track my order",
    "tracking information",
    "where is my order",
    "order #1009",
    "my order status",
    "shipping details",
    "delivery status",
    // Should NOT match (product queries)
    "show me red dresses",
    "what colors is this available in",
    "find me shoes"
  ];

  console.log('=== ORDER DETECTION TEST ===');
  
  testMessages.forEach(message => {
    const messageLower = message.toLowerCase().trim();
    
    const isOrderQuery = orderRelatedPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(messageLower);
    });
    
    const shouldMatch = message.includes('order') || message.includes('track') || message.includes('shipping') || message.includes('delivery');
    const result = isOrderQuery ? '✅ ORDER' : '❌ NOT ORDER';
    const expected = shouldMatch ? 'SHOULD MATCH' : 'SHOULD NOT MATCH';
    const status = (isOrderQuery === shouldMatch) ? '✅' : '❌';
    
    console.log(`${status} "${message}" → ${result} (${expected})`);
  });
}

// Test the specific case from your example
function testSpecificCase() {
  const message = "please give me order details";
  const messageLower = message.toLowerCase().trim();
  
  const pattern = '\\\\b(?:give|show|tell)\\\\s+me.{0,20}\\\\border';
  const regex = new RegExp(pattern, 'i');
  const matches = regex.test(messageLower);
  
  console.log('=== SPECIFIC TEST ===');
  console.log('Message:', message);
  console.log('Pattern:', pattern);
  console.log('Matches:', matches);
  console.log('Expected: true');
}

// Run tests
testOrderDetection();
testSpecificCase();