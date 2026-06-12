// Runs before `npm run dev`. If there's no local .env yet (e.g. a fresh clone),
// copy .env.example so the app and Prisma have a DATABASE_URL out of the box.
// This is a local-dev convenience only — production env vars come from Coolify.
import { copyFileSync, existsSync } from "node:fs";

const ENV = ".env";
const EXAMPLE = ".env.example";

if (!existsSync(ENV) && existsSync(EXAMPLE)) {
  copyFileSync(EXAMPLE, ENV);
  console.log(`Created ${ENV} from ${EXAMPLE} — edit it if you need to.`);
}
