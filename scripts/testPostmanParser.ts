import fs from 'fs';
import path from 'path';
import { parsePostmanCollection, parsePostmanEnvironment } from '../apps/web/lib/postman';

const filePath = path.join(__dirname, '../../test-postman-collection.json');
const raw = fs.readFileSync(filePath, 'utf8');
const collection = JSON.parse(raw);

let envVars = {};
const envPath = path.join(__dirname, '../../test-postman-environment.json');
if (fs.existsSync(envPath)) {
  const envRaw = fs.readFileSync(envPath, 'utf8');
  const env = JSON.parse(envRaw);
  envVars = parsePostmanEnvironment(env);
  console.log('Loaded env vars:', envVars);
}

const requests = parsePostmanCollection(collection, envVars);
console.log('Parsed Requests:', requests);

requests.forEach((r, i) => {
  console.log(`Request ${i+1}: ${r.httpMethod} ${r.endpoint}`);
});
