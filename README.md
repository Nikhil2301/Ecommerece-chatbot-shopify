# AI E-Commerce Chatbot

This project is an AI-powered e-commerce chatbot built with a FastAPI backend and a Next.js frontend. It integrates with Shopify for product and order management, uses PostgreSQL for relational data storage, Qdrant for vector search, and OpenAI for natural language processing to provide a seamless shopping experience.

## Features
- **Product Search and Recommendations**: Users can search for products and get detailed information (price, sizes, colors, etc.).
- **Order Tracking**: Users can query order status using order numbers or email addresses.
- **AI-Powered Chatbot**: Leverages OpenAI for intent analysis and natural language responses.
- **Shopify Integration**: Syncs products, orders, and inventory via webhooks.
- **Vector Search**: Uses Qdrant for efficient product search and recommendations.
- **Responsive Frontend**: Built with Next.js for a modern user interface.

## Prerequisites
Before setting up the project, ensure you have the following installed:
- **Python 3.8+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **PostgreSQL** (local or via Docker)
- **Docker** (optional, for Qdrant and PostgreSQL)
- **ngrok** (for local webhook testing)
- **Shopify Store** with admin access and API credentials
- **OpenAI API Key** for chatbot functionality

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-ecommerce-chatbot.git
cd ai-ecommerce-chatbot
```

### 2. Configure Environment Variables
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Copy the `env.example` file to `.env`:
   ```bash
   cp env.example .env
   ```
3. Edit the `.env` file to include your configuration:
   - `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@localhost:5432/ai_ecommerce_chatbot`)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_MODEL`: OpenAI model name (e.g., `gpt-4`)
   - `SHOPIFY_STORE_URL`: Your Shopify store URL (e.g., `https://your-store.myshopify.com`)
   - `SHOPIFY_ACCESS_TOKEN`: Shopify admin API access token
   - `SHOPIFY_API_VERSION`: Shopify API version (e.g., `2023-10`)
   - `SHOPIFY_WEBHOOK_SECRET`: Shopify webhook secret
   - `QDRANT_HOST`: Qdrant host (e.g., `localhost`)
   - `QDRANT_PORT`: Qdrant port (e.g., `6333`)
   - `QDRANT_API_KEY`: Qdrant API key (if required)
   - `APP_HOST`: Backend host (e.g., `localhost`)
   - `APP_PORT`: Backend port (e.g., `8000`)
   - `DEBUG`: Set to `true` for development

### 3. Install Backend Dependencies
1. Create and activate a Python virtual environment:
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 4. Set Up PostgreSQL Database
1. Ensure PostgreSQL is running (use Docker or a local installation).
2. Create a database:
   ```bash
   psql -U postgres
   CREATE DATABASE ai_ecommerce_chatbot;
   \q
   ```
3. Initialize database tables by running the bootstrap script:
   ```bash
   cd backend
   python scripts/bootstrap_backend.py
   ```
   This script:
   - Creates all required PostgreSQL tables using SQLAlchemy ORM
   - Sets up the Qdrant vector collection
   - Prints status messages for each step
   - Check `backend/app.log` for errors if the script fails

### 5. Set Up Qdrant Vector Database
1. Start Qdrant using Docker:
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```
2. The `bootstrap_backend.py` script (run in step 4) automatically creates the necessary Qdrant vector collection. Ensure `QDRANT_HOST`, `QDRANT_PORT`, and `QDRANT_API_KEY` (if required) are set in the `.env` file.

### 6. Configure Shopify Webhooks
1. Start ngrok to expose your local backend:
   ```bash
   ngrok http 8000
   ```
   Copy the HTTPS forwarding URL (e.g., `https://ff111e53f98533b.ngrok-free.app`).
2. Register Shopify webhooks using the ngrok URL:
   ```bash
   cd backend
   python scripts/setup_webhooks.py https://ff111e53f98533b.ngrok-free.app
   ```
3. Verify webhook registration:
   ```bash
   python scripts/setup_webhooks.py list
   ```
   This will display all registered webhooks, such as:
   - `products/create` -> `https://ff111e53f98533b.ngrok-free.app/api/v1/webhooks/products-create`
   - `products/update`, `products/delete`, `orders/create`, etc.
4. In your Shopify admin, go to **Settings > Notifications > Webhooks** and ensure the webhook URLs match those listed by the `list` command.
5. To delete webhooks (if needed):
   ```bash
   python scripts/setup_webhooks.py delete
   ```

### 7. Install Frontend Dependencies
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node.js dependencies:
   ```bash
   npm install
   ```

### 8. Run the Backend
1. Navigate to the `backend` folder and activate the virtual environment:
   ```bash
   cd backend
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Start the FastAPI backend:
   - **With initial sync** (syncs Shopify products and orders):
     ```bash
     SKIP_INITIAL_SYNC=false python3 -m uvicorn app.main:app --reload --port 8000
     ```
   - **Without initial sync** (faster startup for development):
     ```bash
     SKIP_INITIAL_SYNC=true python3 -m uvicorn app.main:app --reload --port 8000
     ```

### 9. Run the Frontend
1. Navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:3000` (or another port if configured).

### 10. Test Webhooks and Sync
- Create, update, or delete products/orders in your Shopify admin to verify webhook sync.
- Check logs in `backend/app.log` and `backend/data_sync.txt` for errors.
- Monitor webhook delivery status in Shopify admin under **Settings > Notifications > Webhooks**.

## Troubleshooting
- **Database Errors**: Ensure `DATABASE_URL` in `.env` is correct and PostgreSQL is running.
- **Qdrant Errors**: Verify Qdrant is running and accessible at `QDRANT_HOST` and `QDRANT_PORT`.
- **Webhook Errors**: Check ngrok URL accessibility and Shopify webhook settings. Use `python scripts/setup_webhooks.py list` to verify registered webhooks.
- **Backend Errors**: Check `backend/app.log` for detailed error messages.
- **Frontend Errors**: Check the browser console and Next.js terminal output for