# Admin Console for Premium Enablement

## Current Pricing Structure
From the environment variables and code inspection:

### Free Tier
- **MONTHLY** polling interval only
- Basic features
- Supported by default

### Premium Tier ($9/month)
- **WEEKLY** polling interval (what you want)
- **BIWEEKLY** polling interval
- Enhanced grace periods
- Advanced notification features

## Admin Console Setup

### Admin Access Requirements
1. **Admin role** in database
2. **Access to your AWS secrets**  
3. **Direct database updates**

### Quick Admin Enablement Script
```sql
-- Enable premium for specific user
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@onceimgone.com';

-- Update user to premium tier
UPDATE "PollingConfig" 
SET 
  interval = 'WEEKLY', 
  gracePeriod1 = 3,
  gracePeriod2 = 3,
  gracePeriod3 = 7
WHERE userId = 'specific-user-id-here';
```

### Admin Portal Functions
1. **Promote user to premium** via admin panel
2. **Override subscription check** for testing
3. **Whitelist specific emails** for premium access

## Manual Setup Steps

1. **Admin access**: Ensure you have admin role (set via API)
2. **Database update**: Direct query or admin interface
3. **Testing**: Verify WEEKLY polling becomes available

The infrastructure is deployed - you just need admin privilege elevation!"