# 🏮 Hollow Expedition - Administrator Guide

Welcome to the **Hollow Expedition** Administration Guide. This document provides step-by-step instructions on how to assign administrator rights to players, enabling access to the built-in **Database Visualizer**.

---

## 🔑 How to Assign Administrator Access

The game uses a secure, server-side user credential system stored in `users.json` at the root of the server directory. To grant a player administrative rights, follow these steps:

### Step 1: Open the User Database
Locate and open the `users.json` file in the root of the game installation directory:
```
c:\Users\keith\Desktop\GameV2\users.json
```

### Step 2: Modify the User Object
Each registered user has an entry under their lowercase username. To assign admin privileges, append the `"isAdmin": true` flag inside their user credentials object.

#### Example Configuration:
```json
{
  "keith": {
    "password": "$2b$10$OW/0vA3WeiEhQ6C5QHH4E.R7.fIzSvvts36Gl0QLKtYa4UaS4bR3.",
    "isAdmin": true
  },
  "standard_player": {
    "password": "$2b$10$.XdpdTaUYaf2zSWkZHPMe.5DOytImgbeTwll76.xuNfQuFuAckfqW"
  }
}
```

> [!IMPORTANT]
> - **Syntax Matters:** Make sure to add a comma `,` to the previous line (e.g., the `password` line) before adding `"isAdmin": true`.
> - **Username Casing:** The server matches usernames authoritatively in lowercase. Make sure the user entry is in lowercase.
> - **Autosave Security:** The role validation is fully enforced on the server-side, preventing non-admin clients from calling or accessing the `/api/admin/database` endpoint directly.

---

## 📊 The Database Visualizer

Once a player is assigned as an administrator, they will see a custom **Admin DB** navigation option in their sidebar:

```
[ SIDEBAR ]
 ├─ Activity
 ├─ Online Players
 ├─ Inventory
 ├─ Admin DB  <-- (Visible only to Admin players)
 └─ Logout
```

The database visualizer allows real-time inspection of the following game configuration collections:
1. **Items Database:** Real-time values, descriptions, item rarities, and recovery effects.
2. **Yokai Database:** Monster statistics, action intervals (combat speed), guaranteed loot drops, and bonus chances.
3. **Actions Database:** Strike damage variances, parry timing frames/mitigations, flee stamina costs, starting profile states, leveling parameters, and drop rates.

---

## 🛡️ Security Features

- **Route Lockout:** The API router enforces check-level checks. Non-admin fetch requests to `/api/admin/database` are met with an immediate `403 Forbidden` status code.
- **Client Shielding:** The Admin panel and tab triggers are completely hidden for non-admin accounts.
