// Starts Expo advertising this machine's .local hostname instead of its Wi-Fi IP.
// Supabase rejects any OAuth return address whose host is a bare IP, so a phone in Expo Go
// would otherwise land on the site URL after Google sign-in. Extra arguments go to `expo start`.
import { spawn } from 'node:child_process';
import { hostname } from 'node:os';

const name = hostname().replace(/\.local$/, '');
const env = {
  ...process.env,
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REACT_NATIVE_PACKAGER_HOSTNAME ?? `${name}.local`,
};
console.log(`Expo will advertise ${env.REACT_NATIVE_PACKAGER_HOSTNAME}`);
spawn('npx', ['expo', 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
}).on('exit', (code) => process.exit(code ?? 0));
