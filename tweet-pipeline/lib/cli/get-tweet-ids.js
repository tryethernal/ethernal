#!/usr/bin/env node
import { getDb } from '../db.js';
const days = Number(process.argv[2] || 7);
const ids = getDb().getTweetIdsForEngagement(days);
console.log(ids.join(','));
