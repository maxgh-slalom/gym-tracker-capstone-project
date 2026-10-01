/** Configuration resolution. Every value has a working default so a fresh clone starts unaided. */

const MIN_NODE = [22, 5, 0];

/** Aborts rather than letting `node:sqlite` fail later with a confusing message. */
function assertNodeVersion() {
  const [major, minor, patch] = process.versions.node.split('.').map(Number);
  const actual = [major, minor, patch];
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] > MIN_NODE[i]) return;
    if (actual[i] < MIN_NODE[i]) {
      throw new Error(
        `GymTracker requires Node.js >= ${MIN_NODE.join('.')} for the built-in node:sqlite module. ` +
          `This process is running ${process.versions.node}. Upgrade Node and try again.`,
      );
    }
  }
}

assertNodeVersion();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  host: '127.0.0.1', // FR-039a: loopback only, never the network
  dbPath: process.env.DB_PATH ?? './data/gymtracker.db',
  nodeEnv: process.env.NODE_ENV ?? 'development',
};
