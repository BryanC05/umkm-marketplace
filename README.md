# MSME Marketplace

A full-stack web application connecting Micro, Small, and Medium Enterprises (MSMEs) with local buyers. Sellers can list their products, and buyers can discover and purchase items from nearby businesses.

## Features

### For Buyers
- Browse products by category
- Search products by name, description, or tags
- Filter by price range and category
- Find nearby sellers using interactive map
- View seller ratings and reviews
- Add products to cart
- Save products for later
- Place orders from local sellers
- Track order status
- Browse seller stores
- Community forums for discussions
- Real-time chat with sellers
- Multi-language support (English/Hindi)
- Dark/light theme support

### For Sellers (MSMEs)
- Register as Micro, Small, or Medium Enterprise
- Add and manage products with images
- Set stock quantities and pricing
- Receive and manage orders
- Update order status (Pending → Confirmed → Preparing → Ready → Delivered)
- View sales dashboard with statistics
- Manage business profile
- Participate in community forums
- Real-time messaging with buyers
- AI-powered logo generation

### Technical Features
- Geolocation-based search for nearby sellers
- Interactive map using Leaflet
- Real-time distance calculations
- JWT-based authentication
- Responsive design for mobile and desktop
- Image upload support
- Product photo enhancement via Claid (manual per image)
- Category-based product filtering
- Real-time chat with WebSocket
- Community forum system
- Multi-language i18n support
- Theme management (dark/light mode)
- Persistent cart and saved items

## Tech Stack

### Backend (Go)
- Go with Gin framework
- MongoDB with official Go driver
- JWT for authentication
- bcrypt for password hashing
- Gorilla WebSocket for real-time chat
- Geospatial queries with MongoDB 2dsphere indexes

### Frontend
- React with Vite
- React Router for navigation
- TanStack Query (React Query) for data fetching
- Zustand for state management
- Native WebSocket for real-time chat
- Leaflet with React-Leaflet for maps
- shadcn/ui component library
- Lucide React for icons
- Tailwind CSS
- i18next for multi-language support

## Project Structure

```
msme-marketplace/
├── backend/
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go
│   │   ├── database/
│   │   │   └── mongo.go
│   │   ├── handlers/
│   │   │   ├── auth.go
│   │   │   ├── users.go
│   │   │   ├── products.go
│   │   │   ├── orders.go
│   │   │   ├── chat.go
│   │   │   ├── forum.go
│   │   │   ├── workflows.go
│   │   │   ├── logo.go
│   │   │   └── webhooks.go
│   │   ├── middleware/
│   │   │   └── auth.go
│   │   ├── models/
│   │   │   ├── user.go
│   │   │   ├── product.go
│   │   │   ├── order.go
│   │   │   ├── chatroom.go
│   │   │   ├── forum.go
│   │   │   └── workflow.go
│   │   └── websocket/
│   │       └── hub.go
│   ├── uploads/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── LocationPicker.jsx
│   │   │   ├── NearbyMap.jsx
│   │   │   ├── ScrollToTop.jsx
│   │   │   ├── forums/
│   │   │   ├── layout/
│   │   │   ├── products/
│   │   │   ├── logo/
│   │   │   └── ui/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── SellerDashboard.jsx
│   │   │   ├── SellerStore.jsx
│   │   │   ├── Sell.jsx
│   │   │   ├── AddProduct.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── NearbyMap.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── SavedProducts.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Messages.jsx
│   │   │   ├── Forums.jsx
│   │   │   ├── Forum.jsx
│   │   │   ├── ThreadDetail.jsx
│   │   │   ├── NewThread.jsx
│   │   │   ├── LogoGenerator.jsx
│   │   │   └── EditThread.jsx
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── config/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env
└── mobile/
    └── (React Native/Expo mobile app)
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- Go (v1.21 or higher)
- MongoDB (local or cloud instance like MongoDB Atlas)
- Git

> **Note:** This repository does not include `node_modules` directories. After cloning, you must run `npm install` in each project directory (backend, frontend, mobile) to install dependencies.

### Backend Setup (Go)

1. Navigate to the backend directory:
```bash
cd msme-marketplace/backend
```

2. Install dependencies:
```bash
go mod download
```

3. Configure environment variables:
   - Copy `.env` file and update values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/msme_marketplace
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
HUGGINGFACE_API_KEY=your-huggingface-api-key
DEEPAI_API_KEY=your-deepai-api-key
POLLINATIONS_API_KEY=your-pollinations-api-key
CLAID_API_KEY=your-claid-api-key
CLAID_BASE_URL=https://api.claid.ai/v1
CLAID_TIMEOUT_SECONDS=45
PRODUCT_IMAGE_MAX_SIZE_MB=5
PRODUCT_IMAGE_MAX_COUNT=4
PRODUCT_ENHANCE_DAILY_LIMIT=20
```

4. Run the backend:
```bash
# Build and run
go build -o server ./cmd/server
./server

# Or run directly
go run ./cmd/server
```

The backend will run on http://localhost:5000

### Adding Test Data (Seed Simulation)

To populate the database with test sellers and products for testing the Nearby feature:

```bash
cd backend
npm install
npm run seed:food
```

This will create 3 test seller accounts and 2 buyer accounts in the Bekasi area:

**Seller Accounts:**
- Dapur Summarecon (email: seller.summarecon@trolitoko.test, password: test123)
- BINUS Student Kitchen (email: seller.binusbekasi@trolitoko.test, password: test123)
- Warung Harapan Indah (email: seller.harapanindah@trolitoko.test, password: test123)

**Buyer Accounts:**
- Budi Test Nearby (email: buyer.nearby1@trolitoko.test, password: test123)
- Nadia Test Nearby (email: buyer.nearby2@trolitoko.test, password: test123)

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd msme-marketplace/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Create or update `.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on http://localhost:5173

5. Build for production:
```bash
npm run build
```

## Deployment

### Deploying to Railway

#### Backend (Go)

1. Create a new project on Railway
2. Connect your GitHub repository
3. Add the following environment variables:
   - `PORT` = `8080`
   - `MONGODB_URI` = your MongoDB connection string
   - `JWT_SECRET` = your JWT secret
   - `HUGGINGFACE_API_KEY` = (optional)
   - `DEEPAI_API_KEY` = (optional)
   - `POLLINATIONS_API_KEY` = (optional)
   - `CLAID_API_KEY` = (optional, enables product image enhancement)
   - `CLAID_BASE_URL` = (optional, default `https://api.claid.ai/v1`)
   - `CLAID_TIMEOUT_SECONDS` = (optional, default `45`)
   - `PRODUCT_IMAGE_MAX_SIZE_MB` = (optional, default `5`)
   - `PRODUCT_IMAGE_MAX_COUNT` = (optional, default `4`)
   - `PRODUCT_ENHANCE_DAILY_LIMIT` = (optional, default `20`)
4. Railway will automatically detect the Dockerfile and build

#### Frontend

1. Build the frontend:
```bash
npm run build
```

2. Deploy the `dist` folder to Railway, Vercel, or any static hosting

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (buyer or seller)
- `POST /api/auth/login` - User login
- `PUT /api/auth/profile` - Update profile (authenticated)

### Products
- `GET /api/products` - Get all products (with filters, pagination, geolocation)
- `GET /api/products/:id` - Get single product
- `GET /api/products/seller/:sellerId` - Get products by seller
- `GET /api/products/my-products` - Get seller's products (authenticated)
- `POST /api/products` - Create product (seller only)
- `PUT /api/products/:id` - Update product (seller only)
- `DELETE /api/products/:id` - Delete product (seller only)

### Product Images
- `POST /api/product-images/process` - Upload and optionally enhance product image (authenticated)
- `DELETE /api/product-images/cleanup` - Best-effort cleanup of uploaded product images (authenticated)

### Users
- `GET /api/users/nearby-sellers` - Get nearby sellers by geolocation
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)
- `GET /api/users/sellers/count` - Get total seller count

### Orders
- `GET /api/orders/my-orders` - Get user's orders (authenticated)
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id/payment` - Update payment status

### Chat
- `GET /api/chat/rooms` - Get user's chat rooms
- `POST /api/chat/rooms` - Create chat room
- `POST /api/chat/rooms/direct` - Create direct chat room
- `GET /api/chat/rooms/:roomId/messages` - Get messages
- `POST /api/chat/rooms/:roomId/messages` - Send message
- `WS /ws` - WebSocket for real-time chat

### Forum
- `GET /api/forum` - Get all forum threads
- `GET /api/forum/:id` - Get single thread with replies
- `POST /api/forum` - Create new thread (authenticated)
- `PUT /api/forum/:id` - Update thread (authenticated)
- `DELETE /api/forum/:id` - Delete thread (authenticated)
- `POST /api/forum/:id/reply` - Add reply (authenticated)
- `POST /api/forum/:id/like` - Like thread (authenticated)

### Logo Generation
- `POST /api/logo/generate` - Generate logo (authenticated)
- `GET /api/logo/history` - Get logo history (authenticated)
- `GET /api/logo/status` - Get generation status (authenticated)
- `PUT /api/logo/select/:logoId` - Select logo (authenticated)
- `DELETE /api/logo/:logoId` - Delete logo (authenticated)

## Key Features Explained

### Geolocation Search
The app uses MongoDB's geospatial queries to find sellers within a specified radius. When a user allows location access, the app:
1. Gets user's coordinates
2. Queries the database for sellers within the selected radius
3. Displays results on an interactive map
4. Calculates distances between user and sellers

### Role-Based Access
- **Buyers**: Can browse products, add to cart, place orders
- **Sellers**: Can manage products, view dashboard, process orders
- Authentication middleware ensures proper access control

### Order Management
Orders flow through statuses:
1. **Pending** - Order placed, awaiting confirmation
2. **Confirmed** - Seller confirmed the order
3. **Preparing** - Seller preparing the items
4. **Ready** - Order ready for pickup/delivery
5. **Delivered** - Order completed
6. **Cancelled** - Order cancelled

### Real-Time Chat
- WebSocket-based messaging between buyers and sellers
- Persistent chat rooms per conversation
- Real-time message updates
- Typing indicators

### Community Forums
- Create discussion threads on various topics
- Reply to threads and engage with community
- Browse forums by category
- Edit and delete own posts
- Like posts and replies

### AI Logo Generation
- Generate logos using AI (Flux/HuggingFace)
- Custom logo upload support
- Rate limiting (5 logos per user)
- Logo history and selection

### Multi-Language Support
- Toggle between English and Hindi
- Translations for all major UI elements
- Persistent language preference

### Theme Support
- Toggle between light and dark modes
- System preference detection
- Theme persists across sessions

## Repository Setup

### Git Best Practices

This repository follows standard Node.js best practices by **not tracking `node_modules` directories** in git. Dependencies are managed via `package.json` files and installed locally using `npm install`.

**Why we don't commit `node_modules`:**
- **Repository size**: `node_modules` can contain thousands of files and hundreds of megabytes
- **Platform differences**: Binaries and symlinks vary between operating systems
- **Security**: Avoids committing potentially vulnerable dependency versions
- **Noise prevention**: Eliminates unnecessary diffs from dependency updates
- **Reproducibility**: Use `package-lock.json` for deterministic installs

**After cloning, always run:**
```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies  
cd frontend && npm install

# Install mobile dependencies (if using mobile app)
cd mobile && npm install
```

## Development Notes

### Running Both Frontend and Backend

**Terminal 1 - Backend:**
```bash
cd backend
go run ./cmd/server
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Adding New Features
1. Backend: Add handlers in `internal/handlers/`
2. Backend: Update models if needed in `internal/models/`
3. Backend: Register routes in `cmd/server/main.go`
4. Frontend: Create/update pages in `src/pages/`
5. Frontend: Add routes in `App.jsx`

### Environment Variables

**Backend (.env):**
| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 5000) |
| MONGODB_URI | MongoDB connection string |
| JWT_SECRET | Secret for JWT signing |
| NODE_ENV | development or production |
| LOGO_MODEL | Logo model to use (flux) |

**Frontend (.env):**
| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend API URL |

## Future Enhancements

- Detailed phased roadmap: [`MVP_ROADMAP.md`](./MVP_ROADMAP.md)
- Monetization workflow and pricing model: [`MONETIZATION_WORKFLOW.md`](./MONETIZATION_WORKFLOW.md)
- [x] Real-time chat between buyers and sellers
- [x] Community forum system
- [x] Multi-language support (English/Hindi)
- [x] Dark/light theme support
- [x] Mobile app (React Native/Expo)
- [ ] Review and rating system
- [ ] Push notifications for order updates
- [ ] Advanced analytics for sellers
- [ ] Delivery tracking system
- [ ] Payment gateway integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues or questions, please open an issue on the repository or contact the development team.

---

Built with ❤️ for MSMEs everywhere!
