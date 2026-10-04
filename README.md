# Balance Grille guest Wi-Fi portal

Custom splash and welcome pages for Balance Grille's free guest Wi-Fi, running on HPE Aruba
Instant On access points. Guests join `@BalanceGrille`, see the splash, tap **Accept & Connect**,
and land on the connected page with ordering, menu, app and social links.

## Everyday commands

Run all of these from the repo root, `~/Projects/balance-wifi`.

| I want to | Command |
| --- | --- |
| Preview the pages on my Mac | `npm start` |
| Publish page changes | `npm run deploy:site` |
| Apply a timer or RADIUS change | `npm run deploy:radius` |
| See who connected and when | `npm run logs` |

First time on a new Mac: `npm install`, then set up `radius/.env` (see [RADIUS server](#radius-server)).

## How it works

1. A guest joins `@BalanceGrille`. The access point (AP) blocks internet and opens the
   **Portal URL**, our splash, adding details to the address such as `site=Balance Perrysburg`
   and `post=captive-2022.aio.cloudauth.net`.
2. The splash shows the location name if `site` matches one it knows.
3. The guest taps **Accept & Connect**. The page sends a fixed guest login to the AP at
   `https://<post>/swarm.cgi`.
4. The AP asks our **RADIUS server** whether that login is allowed.
5. The server says yes and returns two timers: the longest a session may last, and how long a
   device can be away before it is forgotten.
6. The AP opens internet access and sends the guest to the **Redirect URL**, the connected page.
7. When a timer runs out the AP forgets the device. Next time, the guest sees the splash again.

If the login fails, the AP sends the guest back to the splash with `?errmsg=`, and the splash
shows "We couldn't connect you. Please try again."

## What is where

| Path | What it is |
| --- | --- |
| `wifi/index.html` | The splash. Logo, welcome line, Accept & Connect, terms link. |
| `wifi/connected/index.html` | The page guests land on once connected. Order, menu, promos, app, socials. |
| `wifi/terms.html` | Guest Wi-Fi terms. **Placeholder wording. Have Balance review it.** |
| `wifi/brand.css` | All styling for the three pages. Fonts are at the top. |
| `wifi/splash.js` | Splash behaviour: points the form at the AP, shows the location and error line. |
| `wifi/specials.js` | Loads the Featured Specials row on the connected page. |
| `wifi/images/` | App badges and the icon sprite. |
| `wifi/logo.svg`, `wifi/favicon.svg` | Logo artwork and browser icon. |
| `radius/authorize` | The guest login and the two timers. |
| `radius/clients.conf.template` | Which devices may talk to the RADIUS server. |
| `radius/deploy.sh` | Installs and configures the RADIUS server. Safe to re-run. |
| `radius/logs.sh` | Prints recent logins and sessions. |
| `radius/.env` | Server address and key locations. **Not committed.** |
| `.github/workflows/pages.yml` | Publishes `wifi/` to GitHub Pages on every push to `main`. |

## The website

**Hosting.** GitHub Pages, from this repo's `wifi/` folder, at `wifi.balancegrille.com`. DNS is a
CNAME at GoDaddy: `wifi` points to `electric-fun.github.io`.

**Publishing.** `npm run deploy:site` pushes to `main`. GitHub publishes in about a minute.
Commit your changes first.

**Preview.** `npm start` opens `http://localhost:8788`. Edit, save, refresh. Useful addresses:

- `/` the splash
- `/?site=Balance%20Perrysburg` the splash with a location line
- `/?errmsg=x` the splash showing the failure message
- `/connected/` the connected page
- `/terms` the terms page

Accept & Connect does nothing useful on your Mac. It only works on the restaurant Wi-Fi.

**Locations.** The splash shows a location when the AP's site name contains one of:
`perrysburg`, `sylvania`, `toledo`, `cleveland`. To add one, edit the `LOCATIONS` list in
`wifi/splash.js`.

**GitHub Pages settings** (repo Settings, Pages): Source is GitHub Actions, custom domain is
`wifi.balancegrille.com`, and **Enforce HTTPS is off**. Leave it off. The Instant On Portal and
Redirect URLs use `http://`.

## RADIUS server

**What it is.** A small always-on server that answers the AP's question "may this guest connect,
and for how long?" It runs FreeRADIUS on a DigitalOcean Droplet (Ubuntu 24.04, smallest plan).
It serves no web pages.

**Setup on a new Mac.** Copy `radius/env.example` to `radius/.env` and fill in three things:

- `RADIUS_HOST`: the Droplet's public IP, from the DigitalOcean dashboard.
- `RADIUS_SSH_KEY`: the SSH key that can log in, `~/.ssh/balance_radius`.
- `RADIUS_SECRET_FILE`: a file containing only the shared secret, `~/.balance-radius-secret`.

**Change how long guests stay connected.** Edit the two numbers in `radius/authorize`, then run
`npm run deploy:radius`. Values are in seconds.

| Setting | Now | Meaning |
| --- | --- | --- |
| `Session-Timeout` | `7200` | A session ends after 2 hours, even if the guest is still there. |
| `Idle-Timeout` | `60` | A device that has left the network is forgotten after about 1 minute and sees the splash again. In practice the AP takes 2 to 3 minutes. A device still in range is never idle; only `Session-Timeout` ends its session. |

**See activity.** `npm run logs` shows the last 20 login decisions and the last 20 session
events. Times are UTC. Devices are shown by the last 4 characters of their Wi-Fi address.

**Rebuild from scratch.** Create a new Ubuntu 24.04 Droplet with the SSH key, put its IP in
`radius/.env`, run `npm run deploy:radius`, then update the server address in the Instant On
RADIUS profile. The script installs everything, sets the firewall, and runs a self-test.

**The shared secret.** A password shared by the AP and the server. It is never committed. To
change it: put the new value in `~/.balance-radius-secret`, run `npm run deploy:radius`, then
paste the same value into the Instant On RADIUS profile. Until both match, no guest can connect.

**If the server is down,** guests already online stay online, but nobody new can connect.

## Instant On settings

Portal: `portal.instant-on.hpe.com`, choose the site, Networks, `@BalanceGrille`, Guest Portal.
Settings are per site. Repeat them for each restaurant.

| Setting | Value |
| --- | --- |
| Type | External |
| Portal URL | `http://wifi.balancegrille.com/` |
| Redirect URL | `http://wifi.balancegrille.com/connected/` |
| Authentication | Guest Authentication (default) |
| RADIUS Profile | Balance RADIUS |
| Allowed Domains | `wifi.balancegrille.com`, `use.typekit.net`, `p.typekit.net` |

RADIUS profile "Balance RADIUS":

| Setting | Value |
| --- | --- |
| Server IP | the Droplet's public IP |
| Shared Secret | contents of `~/.balance-radius-secret` |
| Authentication Port | 1812 |
| RADIUS Accounting | on, port 1813 |
| Require RADIUS Message-Authenticator | on |
| Timeout, retry, NAS settings | defaults |

## Testing on a real device

1. On the phone, forget `@BalanceGrille`, then join it.
2. The splash appears. The bar says Cancel.
3. Tap Accept & Connect. The connected page loads and the bar says Done.
4. Run `npm run logs`. A new "Login OK" and a "Start" should be there.

To test again right away on the same device, wait out the idle timer, or restart the AP, which
clears every approved device.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| No splash, phone goes straight online | AP still remembers the device | Wait out the idle timer, or restart the AP. |
| No splash, phone says "No Internet Connection" | Phone was told to use the network without internet | Forget the network and rejoin. |
| "Failed to join" right after an AP restart | AP still starting, takes about 3 minutes | Wait and retry. |
| Splash says "We couldn't connect you" | RADIUS refused or was unreachable | `npm run logs`. No new line means the AP can't reach the server: check the IP and secret in Instant On. "Login incorrect" means the login in `wifi/index.html` and `radius/authorize` differ. |
| Tapping Accept shows "server cannot be found" | Form is not pointed at the AP's own host | Check the `post=` value in the splash address is one of the hosts accepted in `wifi/splash.js`. |
| Safari warns "This form is not secure" | Form is posting to `http://` | The form action must be `https://`. |
| Fonts look wrong on the splash | Adobe font hosts blocked before connecting | Confirm the two typekit domains are in Allowed Domains. |
| Connected page shows a browser error | Redirect URL uses `https://` | Use `http://` until HTTPS is working for the domain. |

## Brand

Styled from the Balance Brand Guide in Figma. FatFrank for headlines, Effra for everything else,
both from Adobe Typekit kit `urb0jph`. Buttons and tags use Effra Heavy 900, labels Bold 700,
body Regular 400. Buttons are white pills with no glow. The logo is the "balance grille" lockup,
one shared file, `wifi/logo.svg`, always 200px wide. The background is one gradient on every
page: dusty ube purple (`--ube`) in the bottom left fading to black. Section spacing comes from
one utility class, `.container`. Colors and sizes are named at the top of `wifi/brand.css`.

The app store badges, social icons and arrows are the same files balancegrille.com uses, in
`wifi/images/`. The badges have their gray outline removed.

The connected page's Featured Specials row is built by `wifi/specials.js` from the
balancegrille.com WordPress API: every menu item in the "Special" category. Change the category
in WordPress and the row follows. If the site cannot be reached the row stays hidden.

## What was tried and did not work

Kept so nobody repeats it.

- **Guest Portal Acknowledgment mode.** Aruba's alternative to RADIUS, where a page returns the
  text `InstantOn.Acknowledge`. It is undocumented and unreliable. It only works over plain
  http, it opened access from a test server but not from GitHub Pages, and it gives no control
  over how long a device is remembered. Do not use it.
- **Posting to `securelogin.arubanetworks.com`.** That hostname is for older Aruba hardware.
  Instant On only answers on the host it passes in `post=`.
- **Cloudflare Pages.** Worked as a host, but was dropped during the acknowledgment experiments.
  It could host the site again now that RADIUS mode works over https.

## Open items

- HTTPS for `wifi.balancegrille.com` on GitHub Pages has not been issued. Once it is, the Portal
  and Redirect URLs can move to `https://`.
- Balance to review the terms wording and supply official app badges and social icons.
- Roll out to all four locations: Downtown Cleveland, Downtown Toledo, Sylvania, Perrysburg.
