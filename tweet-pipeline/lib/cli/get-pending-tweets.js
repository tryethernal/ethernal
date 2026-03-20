#!/usr/bin/env node
import { getDb } from '../db.js';
console.log(JSON.stringify(getDb().getPendingTweets()));
