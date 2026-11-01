# Turbo Royale

Free 3D kart racing in the browser — solo vs bots, or with friends in a party.

## Put it online (pick one)

**GitHub Pages (free, permanent link)**
1. Create a free account at github.com, then click **New repository** → name it `turbo-royale` → **Public** → Create.
2. Click **uploading an existing file**, drag in everything from this folder (`index.html`, the `js` folder, this README), and click **Commit changes**.
3. Go to **Settings → Pages**. Under *Branch* choose `main` and `/ (root)`, then **Save**.
4. After about a minute your game is live at `https://YOUR-USERNAME.github.io/turbo-royale/`.

**Netlify Drop (fastest)**
1. Go to app.netlify.com/drop and sign up (free).
2. Drag this whole folder onto the page. You get a link like `https://something.netlify.app` right away.

## Playing with friends
- Click **Create party**, then **Copy invite link** and send it. Friends just open the link — no account needed.
- Or they type the 5-letter party code into **Join**.
- The party leader's browser runs the race, so the leader should have a decent connection and keep the tab open.

## Notes
- Progress (coins, items, pass) saves in each player's browser. Settings → **Transfer progress** moves it to another device.
- Multiplayer connects players' browsers directly (WebRTC via the free PeerJS service). Some very strict networks (some schools or workplaces) block this; home Wi-Fi and phone hotspots work.
- Must be opened from a website (https), not by double-clicking `index.html`.
