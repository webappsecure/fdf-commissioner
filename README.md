# FDF Commissioner

A local-first app for running Fast Drive Football (FDF) leagues with the Commissioner Expansion rules. It automates the guide's dice procedures (league creation, rosters, headlines, development, the draft) and keeps years of history on the device. It does not simulate games.

Targets: iPad, Android tablets and phones, through [Expo Go](https://expo.dev/go). Web is not a target.

## Run it

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

3. Scan the QR code with Expo Go, or press `i` or `a` for a simulator or emulator. `npm run ios` and `npm run android` start the same server and open that platform.

## Develop

- `npm test` runs the unit tests (Jest with `jest-expo`).
- `npx tsc --noEmit` checks types.
- `npm run lint` runs ESLint.
- `npx expo export --platform ios` and `--platform android` check that the app bundles.

Source is in `src/` (routes in `src/app/`). Project plans and the build workflow are in `blueprint/`, and the rules guide is in `blueprint/reference/`.

## Credits

Built for Fast Drive Football and the Commissioner Expansion (Draft Edition v1.0) by d6 Gaming / PLAAY Games. The rules author has given permission to include the rules. License and attribution details come with the release polish step (feature 20). This project started from the Expo starter, which is MIT licensed (see `LICENSE`).
