# User Management System

This is a complete user management example built with Next.js 16, React 19, and Tailwind CSS.

## Features

- ✅ Add users with name, email, and phone number
- ✅ View all users in a table
- ✅ Delete users
- ✅ Refresh user list
- ✅ Form validation
- ✅ Error handling
- ✅ Responsive design
- ✅ Modern UI with Tailwind CSS

## Getting Started

1. **Install dependencies** (if not already installed):
   ```bash
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000/users`

## Current Implementation

The current implementation uses **in-memory storage** for demo purposes. This means:
- Data is stored in the server's memory
- Data will be lost when the server restarts
- Suitable for development and testing

## Upgrading to PostgreSQL (Optional)

To use a real database, follow these steps:

### 1. Install PostgreSQL dependencies:
```bash
pnpm add pg @types/pg
```

### 2. Set up your database:
Create a `.env.local` file with your database connection:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/userdb
```

### 3. Create the users table:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Update the API route:
Replace the in-memory storage in `app/api/users/route.ts` with PostgreSQL queries.

## File Structure

```
app/
├── users/
│   └── page.tsx          # User management page (UI)
├── api/
│   └── users/
│       └── route.ts      # API endpoints (GET, POST, DELETE)
└── ...
```

## API Endpoints

### GET `/api/users`
Returns all users.

**Response:**
```json
[
  {
    "id": "1234567890",
    "name": "Sam Aravind",
    "email": "samaravind.svv@gmail.com",
    "phone": "6383205450"
  }
]
```

### POST `/api/users`
Creates a new user.

**Request body:**
```json
{
  "name": "Sam Aravind",
  "email": "samaravind.svv@gmail.com",
  "phone": "6383205450"
}
```

**Response:**
```json
{
  "id": "1234567890",
  "name": "Sam Aravind",
  "email": "samaravind.svv@gmail.com",
  "phone": "6383205450"
}
```

### DELETE `/api/users?id={userId}`
Deletes a user by ID.

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## Tech Stack

- **Next.js 16.3.4** - React framework with App Router
- **React 19.2.8** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Server Components & Client Components** - Optimal rendering

## Notes

- The page uses `'use client'` directive because it needs client-side state management
- Form validation is implemented on both client and server side
- Duplicate email addresses are prevented
- The UI matches modern design patterns with proper spacing and colors

## Customization

You can customize the UI by:
- Modifying colors in the Tailwind classes
- Adding more fields to the user form
- Implementing edit functionality
- Adding pagination for large user lists
- Adding search and filter features

## Next Steps

1. Add user edit functionality
2. Implement user search
3. Add pagination
4. Connect to a real database
5. Add user authentication
6. Implement role-based access control
