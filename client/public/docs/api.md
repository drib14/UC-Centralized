# UC-Central API Documentation

Welcome to the UC-Central API. This API provides access to the school management system's core features including Users, Events, Merchandise, Orders, and Announcements.

## Authentication

You can authenticate using **JWT Token** (for frontend) or **API Key** (for external apps).

### Using API Key
Include your API Key in the request header:
`x-api-key: YOUR_API_KEY`

### OAuth 2.0
Use UC-Central as an identity provider.
1. Register app in Developer Console.
2. Redirect to `/oauth/authorize`.
3. Exchange code at `/oauth/token`.

### Endpoints

#### Login
- **URL:** `/auth/login`
- **Method:** `POST`
- **Body:** `{ "studentId": "12345", "password": "..." }`

#### Register
- **URL:** `/auth/register`
- **Method:** `POST`
- **Body:** `{ "studentId": "...", "email": "...", "password": "...", "firstName": "...", "lastName": "..." }`

## Data Models

### User Schema
```json
{
    "studentId": "String (Required, Unique)",
    "email": "String (Required, Unique)",
    "password": "String (Hashed)",
    "firstName": "String",
    "lastName": "String",
    "department": "String (Default: CCS)",
    "program": "String",
    "year": "String",
    "role": "String (student|admin)",
    "profileImage": "String (URL)",
    "apiKey": "String (Sparse, Unique)"
}
```

### Event Schema
```json
{
    "title": "String",
    "description": "String",
    "date": "String",
    "time": "String",
    "location": "String",
    "image": "String (URL)",
    "department": "String (Default: ALL)",
    "attendees": "[ObjectId (Ref: User)]"
}
```

### Merch Schema
```json
{
    "name": "String",
    "description": "String",
    "price": "Number",
    "stock": "Number",
    "category": "String (wearable|accessories)",
    "variants": "[{ size, color, stock }]",
    "image": "String (URL)"
}
```

### Order Schema
```json
{
    "user": "ObjectId (Ref: User)",
    "customerName": "String",
    "items": "[{ merch, quantity, variant }]",
    "totalPrice": "Number",
    "status": "String (pending|processing|claimed|cancelled)",
    "orderDate": "Date"
}
```

### Announcement Schema
```json
{
    "title": "String",
    "message": "String",
    "date": "Date",
    "author": "String",
    "department": "String"
}
```

## Resources

### Users
- `GET /users`: Get all users (Admin only)
- `GET /auth/me`: Get current user profile

### Events
- `GET /events`: Get all events
- `POST /events`: Create a new event (Admin only)

### Merchandise
- `GET /merch`: Get all merchandise items

### Orders
- `GET /orders`: Get all orders
- `POST /orders`: Create a new order

### Announcements
- `GET /announcements`: Get all announcements
