#!/usr/bin/env node
import { getDb } from '../db.js';
const tweet = JSON.parse(await new Promise(r => { let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>r(d)); }));
const result = getDb().addTweet(tweet);
console.log(JSON.stringify({ id: Number(result.lastInsertRowid) }));
