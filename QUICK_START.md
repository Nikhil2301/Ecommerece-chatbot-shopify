# Quick Start Guide - Theme & Improvements

## 🚀 Running the Application

### Frontend
```bash
cd frontend
npm install          # Install dependencies (if needed)
npm run dev          # Start development server
```

Visit: `http://localhost:3000`

### Backend
```bash
cd backend
pip install -r requirements.txt  # Install dependencies (if needed)
uvicorn app.main:app --reload    # Start backend server
```

API: `http://localhost:8000`

---

## 🎨 Testing Theme System

### Manual Testing
1. **Open the app** at `http://localhost:3000`
2. **Click theme toggle** in the header (3 icon buttons)
3. **Test each mode**:
   - ☀️ Light mode
   - 🌙 Dark mode
   - 💻 System mode (follows OS)
4. **Verify persistence**: Reload page, theme should persist
5. **Test navigation**: Go to `/home`, theme should remain

### Components to Check
- ✅ Landing page (`/`)
- ✅ Chat page (`/home`)
- ✅ Product cards (search for products in chat)
- ✅ Chat input field
- ✅ Welcome message
- ✅ Sample question buttons

---

## 🧪 Running Backend Tests

### Run All Tests
```bash
cd backend
pytest tests/test_openai_service.py -v
```

### Run Specific Test
```bash
pytest tests/test_openai_service.py::TestExtractProductOptions::test_extract_options_with_standard_structure -v
```

### Expected Output
```
test_extract_options_with_standard_structure PASSED
test_extract_options_with_dict_values PASSED
test_extract_options_missing_options_field PASSED
test_extract_options_empty_product PASSED
test_extract_options_with_age_group PASSED
test_extract_options_with_three_options PASSED
test_extract_options_case_insensitive_matching PASSED
test_extract_options_with_null_values PASSED
test_extract_options_preserves_order PASSED
test_image_request_direct_response PASSED
test_no_images_available PASSED

========== 11 passed in X.XXs ==========
```

---

## 🔍 Verifying Dynamic Product Handling

### Test with Different Product Structures

1. **Standard product** (Color + Size):
   ```
   User: "Show me red shirts"
   Bot: [Displays products]
   User: "What colors are available?" (for product #1)
   Bot: [Lists actual colors from product data]
   ```

2. **Custom options** (Material + Age Group):
   ```
   User: "Find cotton kids clothing"
   Bot: [Displays products]
   User: "What materials?" (for product #1)
   Bot: [Lists actual materials dynamically]
   ```

3. **Three-dimensional options** (Color + Size + Style):
   ```
   User: "Show me modern black shirts"
   Bot: [Displays products with 3 options]
   User: "What styles are available?"
   Bot: [Lists all style options]
   ```

---

## 🎯 Key Features to Verify

### Theme System
- [ ] Light mode displays correctly
- [ ] Dark mode displays correctly
- [ ] System mode follows OS preference
- [ ] Theme persists after reload
- [ ] Theme toggle is visible in header
- [ ] All text is readable in both modes
- [ ] Product cards look good in both modes
- [ ] Chat input is styled correctly

### Dynamic Product Options
- [ ] Color questions work for any product
- [ ] Size questions work for any product
- [ ] Custom options (fabric, age, etc.) are extracted
- [ ] Variant stock status is accurate
- [ ] No hardcoded option names in responses
- [ ] Works with 1, 2, or 3 option dimensions

---

## 🐛 Troubleshooting

### Theme Not Switching
1. Check browser console for errors
2. Clear localStorage: `localStorage.clear()`
3. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### Dark Mode Not Applying
1. Verify Tailwind config has `darkMode: 'class'`
2. Check `<html>` element has `dark` class in dev tools
3. Ensure ThemeProvider is wrapping the app

### Tests Failing
1. Ensure you're in the `backend` directory
2. Check Python version: `python --version` (should be 3.8+)
3. Install pytest: `pip install pytest`
4. Verify OpenAI service imports correctly

### Product Options Not Dynamic
1. Check product data structure in database
2. Verify `options` and `variants` fields exist
3. Run backend tests to confirm extraction logic
4. Check backend logs for errors

---

## 📝 Making Changes

### Adding Dark Mode to New Component
```tsx
// 1. Import useTheme if needed
import { useTheme } from '@/components/ThemeProvider';

// 2. Add dark: variants to className
<div className="bg-white dark:bg-gray-900">
  <h1 className="text-gray-900 dark:text-gray-100">Title</h1>
  <p className="text-gray-600 dark:text-gray-300">Description</p>
</div>
```

### Adding New Product Option Type
The system is already dynamic! Just ensure your product data includes:
```json
{
  "options": [
    {"name": "YourNewOption", "values": ["Value1", "Value2"]}
  ],
  "variants": [
    {"option1": "Value1", "inventory_quantity": 10}
  ]
}
```

---

## 📚 Documentation

- **Full documentation**: See `THEME_AND_IMPROVEMENTS.md`
- **Component docs**: Check individual component files
- **API docs**: Visit `http://localhost:8000/docs` (when backend is running)

---

## ✅ Checklist for Production

### Frontend
- [ ] Test theme system on all pages
- [ ] Verify mobile responsiveness
- [ ] Check accessibility (keyboard navigation)
- [ ] Test with different browsers
- [ ] Optimize images and assets
- [ ] Build production bundle: `npm run build`

### Backend
- [ ] Run all tests: `pytest`
- [ ] Test with real Shopify data
- [ ] Verify API rate limits
- [ ] Check error handling
- [ ] Review logs for warnings
- [ ] Set environment variables

---

## 🎉 Success Criteria

Your implementation is working correctly if:

1. ✅ Theme toggle switches between light/dark/system
2. ✅ Theme preference persists across sessions
3. ✅ All pages are readable in both themes
4. ✅ Product cards display correctly in both themes
5. ✅ Chat interface is fully functional in both themes
6. ✅ Backend tests pass (11/11)
7. ✅ Product options are extracted dynamically
8. ✅ No hardcoded variant values in responses

---

**Need Help?** Check the main documentation in `THEME_AND_IMPROVEMENTS.md`
