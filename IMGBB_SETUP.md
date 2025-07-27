# ImgBB API Setup Instructions

## Required: Get Your ImgBB API Key

1. **Go to ImgBB**: Visit [https://api.imgbb.com/](https://api.imgbb.com/)
2. **Sign Up/Login**: Create an account or login to your existing account
3. **Get API Key**: After logging in, you'll see your API key on the dashboard
4. **Copy the Key**: Copy your API key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

## Update the Code

In `src/app/app.ts`, find this line around line 325:

```typescript
const API_KEY = 'YOUR_IMGBB_API_KEY'; // Replace with your actual key
```

Replace `YOUR_IMGBB_API_KEY` with your actual API key:

```typescript
const API_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'; // Your actual API key
```

## Security Note

⚠️ **Important**: For production applications, store the API key in environment variables instead of hardcoding it in the source code.

## Testing

After setting up the API key:
1. Upload an image in Provider Menu
2. Check that the image URLs start with `https://i.ibb.co/` (ImgBB URLs)
3. Verify that clicking on images opens them in new tabs
4. Test CSV download to ensure image links are included

## Troubleshooting

- **Upload fails**: Check your API key is correct
- **CORS errors**: ImgBB API should allow browser requests
- **File size**: ImgBB has a 32MB limit per image
