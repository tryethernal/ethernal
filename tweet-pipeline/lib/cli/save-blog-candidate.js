#!/usr/bin/env node
import { getDb } from '../db.js';
const data = JSON.parse(await new Promise(r => { let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>r(d)); }));
getDb().saveBlogCandidate(data);
