import { search } from './retriever.mjs';
const q = process.argv.slice(2).join(' ') || 'What is amlodipine used for?';
const res = await search(q, 3);
console.log(JSON.stringify(res, null, 2));
