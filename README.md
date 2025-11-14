# SnapShoot

A fun shooting game integrated with Toss Game Center!

## Features

- 🎮 **Toss Game Center Integration**
  - Real-time leaderboard synchronization
  - Automatic score submission to Toss ranking
  - Game Center leaderboard viewer

- 📱 **Ad Integration**
  - Rewarded ads for continue gameplay
  - Seamless ad experience with Toss AdMob

## Setup

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Then configure the following variables:

- `VITE_TOSS_AD_GROUP_ID`: Your Toss Ad Group ID from [Toss Apps Console](https://developers-apps-in-toss.toss.im/)

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Toss Game Features

### 1. Leaderboard
- View global rankings by clicking "랭킹보기" button in Game Over modal
- Scores are automatically submitted to Toss Game Center when you score

### 2. Continue with Ads
- Watch rewarded ads to continue playing after a miss
- Get a second chance to improve your score

### 3. Score Submission
- Scores are automatically synced with Toss Game Center
- Real-time ranking updates

