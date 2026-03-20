#!/usr/bin/env node
import { getDb } from '../db.js';
const days = Number(process.argv[2] || 30);
console.log(JSON.stringify(getDb().getRecentSourceIds(days)));
