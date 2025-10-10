// Quick test for order detection patterns
console.log('Testing order detection patterns...');

const orderRelatedPatterns = [
  // Direct order requests
  '\\b(?:order|orders)\\s+(?:details?|info|information|status)\\b',
  '\\b(?:give|show|tell)\\s+me.{0,20}\\border',
  '\\b(?:my|the)\\s+order',
  '\\border\\s+(?:number|#)\\s*\\d+',
  // Tracking related
  '\\b(?:track|tracking)\\b',
  '\\b(?:shipping|delivery)\\s+(?:status|info|details?)',
  '\\bwhere\\s+is\\s+my',
  '\\bwhen\\s+will\\s+(?:it|my\\s+order)',
  // Status inquiries
  '\\b(?:order|shipping|delivery)\\s+status\\b',
  '\\bstatus\\s+of\\s+(?:my\\s+)?order\\b',
];

const testMessages = [
  'what is my order status?',
  'please show me order status of order no 1009',
  'order details',
  'give me order info',
  'tell me about my order'
];

testMessages.forEach(message => {
  const messageLower = message.toLowerCase().trim();
  console.log(`\\nTesting: "${message}"`);
  
  let matched = false;
  orderRelatedPatterns.forEach((pattern, index) => {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(messageLower)) {
        console.log(`  ✅ MATCHED pattern ${index + 1}: ${pattern}`);
        matched = true;
      }
    } catch (error) {
      console.log(`  ❌ ERROR in pattern ${index + 1}: ${error.message}`);
    }
  });
  
  if (!matched) {
    console.log('  ❌ NO MATCH');
  }
});

console.log('\\nPattern testing complete!');